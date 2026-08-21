import 'server-only';

import { timingSafeEqual } from 'crypto';
import Stripe from 'stripe';
import {
  getOrderById,
  getBaseUrl,
  getOrderDetailsUrl,
  getOrderPublicToken,
  getPayLinkUrl,
  getPayLinkStripeSuccessUrl,
} from '@/lib/orders';
import {
  isAdminPayLinkOrder,
  PAY_LINK_STRIPE_EXPIRES_MINUTES,
  payLinkUnusableReason,
  STRIPE_PAY_LINK_SOURCE,
} from '@/lib/payLinks/adminPayLink';
import { buildStripeOrderMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import {
  buildStripeCheckoutLineItems,
  stripeOrderSuccessUrl,
} from '@/lib/stripe/checkoutStripeLineItems';
import { stripeIdempotencyFingerprint } from '@/lib/stripe/idempotency';
import { applyExpansionItemMarkupThb, EXPANSION_MARKUP_DESTINATIONS } from '@/lib/expansionMarkup';
import { getDiscountAllocationForCode } from '@/lib/referral';
import { isValidLocale } from '@/lib/i18n';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isSupabaseMissingColumnError } from '@/lib/supabase/columnErrors';
import type { CheckoutAnalyticsContext } from '@/lib/analytics/captureAnalyticsContext';
import {
  resolveAndPersistAttribution,
  resolvedClickIds,
  type AttributionHints,
} from '@/lib/attribution/resolve';
import type { CookieReader } from '@/lib/attribution/types';

export type CreateCheckoutSessionForOrderResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; status: number; error: string };

function tokensEqual(a: string, b: string): boolean {
  const aa = a.trim();
  const bb = b.trim();
  if (!aa || !bb) return false;
  const aBuf = Buffer.from(aa, 'utf8');
  const bBuf = Buffer.from(bb, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

async function persistOrderAnalyticsContext(
  orderId: string,
  fields: CheckoutAnalyticsContext & { attribution_id?: string },
): Promise<void> {
  const updates: Record<string, string> = {};
  if (fields.ga_client_id) updates.ga_client_id = fields.ga_client_id;
  if (fields.ga_session_id) updates.ga_session_id = fields.ga_session_id;
  if (fields.gclid) updates.gclid = fields.gclid;
  if (fields.gbraid) updates.gbraid = fields.gbraid;
  if (fields.wbraid) updates.wbraid = fields.wbraid;
  if (fields.attribution_id) updates.attribution_id = fields.attribution_id;
  if (Object.keys(updates).length === 0) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('order_id', orderId);

  if (error && isSupabaseMissingColumnError(error, 'attribution_id') && updates.attribution_id) {
    const { attribution_id: _drop, ...rest } = updates;
    if (Object.keys(rest).length === 0) return;
    await supabase
      .from('orders')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('order_id', orderId);
  }
}

export async function createCheckoutSessionForExistingOrder(params: {
  orderId: string;
  publicToken: string;
  lang?: string;
  analytics?: CheckoutAnalyticsContext;
  cookies?: CookieReader;
}): Promise<CreateCheckoutSessionForOrderResult> {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return { ok: false, status: 500, error: 'Stripe is not configured' };
  }

  const orderId = params.orderId.trim();
  const publicToken = params.publicToken.trim();
  if (!orderId) return { ok: false, status: 400, error: 'orderId is required' };
  if (!publicToken) return { ok: false, status: 400, error: 'publicToken is required' };

  const lang = params.lang && isValidLocale(params.lang) ? params.lang : 'en';

  const expectedPublicToken = await getOrderPublicToken(orderId);
  if (!expectedPublicToken) {
    return { ok: false, status: 404, error: 'Order not found' };
  }
  if (!tokensEqual(expectedPublicToken, publicToken)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return { ok: false, status: 404, error: 'Order not found' };
  }

  if (params.cookies || params.analytics) {
    const hints: AttributionHints = {
      visitor_id: params.analytics?.visitor_id,
      gclid: params.analytics?.gclid,
      gbraid: params.analytics?.gbraid,
      wbraid: params.analytics?.wbraid,
      utm_source: params.analytics?.utm_source,
      utm_medium: params.analytics?.utm_medium,
      utm_campaign: params.analytics?.utm_campaign,
      utm_content: params.analytics?.utm_content,
      utm_term: params.analytics?.utm_term,
      campaign_id: params.analytics?.campaign_id,
      adgroup_id: params.analytics?.adgroup_id,
      keyword: params.analytics?.keyword,
      device: params.analytics?.device,
      network: params.analytics?.network,
      matchtype: params.analytics?.matchtype,
    };
    const emptyCookies: CookieReader = { get: () => undefined };
    const resolved = await resolveAndPersistAttribution({
      cookies: params.cookies ?? emptyCookies,
      hints,
    });
    const attr = resolvedClickIds(resolved);
    await persistOrderAnalyticsContext(orderId, {
      ...(params.analytics ?? {}),
      ...attr,
    });
  }

  const supabasePayment = await getSupabasePaymentStatusByOrderId(orderId);
  const paymentStatus = (supabasePayment?.payment_status ?? order.status ?? '').toUpperCase();
  if (paymentStatus === 'PAID') {
    return { ok: false, status: 400, error: 'Order is already paid' };
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  const baseUrl = getBaseUrl();
  const payLink = isAdminPayLinkOrder(order);
  if (payLink && payLinkUnusableReason(order, order.createdAt)) {
    return { ok: false, status: 410, error: 'This payment link is no longer active' };
  }
  const metadata = buildStripeOrderMetadata({
    orderId: order.orderId,
    source: payLink ? STRIPE_PAY_LINK_SOURCE : 'lanna_bloom_order_page',
    customerEmail: order.customerEmail,
    lang,
  });

  const dest = order.delivery?.deliveryDestination ?? 'CHIANG_MAI';

  const deliveryFee = order.pricing?.deliveryFee ?? 0;
  const referralDiscount = order.referralDiscount ?? 0;

  const repricedItems =
    EXPANSION_MARKUP_DESTINATIONS.has(dest) && (order.items?.length ?? 0) > 0
      ? (order.items ?? []).map((it) => ({
          ...it,
          price: applyExpansionItemMarkupThb(it.price, dest),
        }))
      : (order.items ?? []);

  const itemsTotal = repricedItems.reduce((sum, it) => sum + (it.price ?? 0), 0);
  const recomputedGrandTotal = itemsTotal + deliveryFee;
  const effectiveGrandTotal = Math.max(0, recomputedGrandTotal - referralDiscount);

  const grandTotal = EXPANSION_MARKUP_DESTINATIONS.has(dest)
    ? effectiveGrandTotal
    : (order.pricing?.grandTotal ?? order.amountTotal ?? 0);

  const lineItems = buildStripeCheckoutLineItems({
    computedItems: repricedItems,
    deliveryFee,
    effectiveGrandTotal: grandTotal,
    referralCode: order.referralCode,
    referralDiscount,
    discountAllocation: order.referralCode ? getDiscountAllocationForCode(order.referralCode) : 'all',
  });

  const successUrl = payLink
    ? getPayLinkStripeSuccessUrl(orderId, expectedPublicToken)
    : expectedPublicToken && expectedPublicToken.trim()
      ? `${stripeOrderSuccessUrl(baseUrl, orderId)}&token=${encodeURIComponent(publicToken.trim())}`
      : stripeOrderSuccessUrl(baseUrl, orderId);
  const cancelUrl = payLink
    ? getPayLinkUrl(orderId, { token: expectedPublicToken, cancelled: true })
    : getOrderDetailsUrl(orderId, { token: expectedPublicToken });

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    client_reference_id: order.orderId,
    customer_email: order.customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    payment_intent_data: { metadata },
    ...(payLink
      ? { expires_at: Math.floor(Date.now() / 1000) + PAY_LINK_STRIPE_EXPIRES_MINUTES * 60 }
      : {}),
  };

  const fingerprint = stripeIdempotencyFingerprint(sessionParams);
  const idempotencyKey = payLink
    ? `pay-link-${orderId}`
    : `order-page-${orderId}-${fingerprint}`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create checkout session';
    console.error('[createCheckoutSessionForExistingOrder]', message);
    return { ok: false, status: 500, error: 'Failed to create checkout session' };
  }

  if (!session.url) {
    return { ok: false, status: 500, error: 'Failed to create checkout session' };
  }

  return { ok: true, url: session.url, orderId: order.orderId };
}
