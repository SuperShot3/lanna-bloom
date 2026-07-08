import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { timingSafeEqual } from 'crypto';
import { getOrderById, getBaseUrl, getOrderDetailsUrl, getOrderPublicToken } from '@/lib/orders';
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
import type { CheckoutAnalyticsContext } from '@/lib/analytics/captureAnalyticsContext';

export const dynamic = 'force-dynamic';

function optionalTrimmedString(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (!t || t.length > maxLen) return undefined;
  return t;
}

function parseCheckoutAnalyticsFields(b: Record<string, unknown>):
  | { ok: true; fields: CheckoutAnalyticsContext }
  | { ok: false; message: string } {
  const ga_client_id = optionalTrimmedString(b.ga_client_id, 64);
  const ga_session_id = optionalTrimmedString(b.ga_session_id, 64);
  const gclid = optionalTrimmedString(b.gclid, 256);
  const gbraid = optionalTrimmedString(b.gbraid, 256);
  const wbraid = optionalTrimmedString(b.wbraid, 256);
  if (ga_client_id && !/^\d+\.\d+$/.test(ga_client_id)) {
    return { ok: false, message: 'ga_client_id has invalid format' };
  }
  return {
    ok: true,
    fields: {
      ...(ga_client_id ? { ga_client_id } : {}),
      ...(ga_session_id ? { ga_session_id } : {}),
      ...(gclid ? { gclid } : {}),
      ...(gbraid ? { gbraid } : {}),
      ...(wbraid ? { wbraid } : {}),
    },
  };
}

async function persistOrderAnalyticsContext(
  orderId: string,
  fields: CheckoutAnalyticsContext,
): Promise<void> {
  const updates: Record<string, string> = {};
  if (fields.ga_client_id) updates.ga_client_id = fields.ga_client_id;
  if (fields.ga_session_id) updates.ga_session_id = fields.ga_session_id;
  if (fields.gclid) updates.gclid = fields.gclid;
  if (fields.gbraid) updates.gbraid = fields.gbraid;
  if (fields.wbraid) updates.wbraid = fields.wbraid;
  if (Object.keys(updates).length === 0) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from('orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('order_id', orderId);
}

function tokensEqual(a: string, b: string): boolean {
  const aa = a.trim();
  const bb = b.trim();
  if (!aa || !bb) return false;
  const aBuf = Buffer.from(aa, 'utf8');
  const bBuf = Buffer.from(bb, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Create a Stripe Checkout Session for an existing order (e.g. from the order page "Pay with Card").
 * Body: { orderId: string, publicToken: string, lang?: string }
 * Returns: { url: string } to redirect the customer to Stripe Checkout.
 */
export async function POST(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  let body: {
    orderId?: string;
    publicToken?: string;
    lang?: string;
    ga_client_id?: string;
    ga_session_id?: string;
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const analyticsParsed = parseCheckoutAnalyticsFields(body as Record<string, unknown>);
  if (!analyticsParsed.ok) {
    return NextResponse.json({ error: analyticsParsed.message }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const publicToken = typeof body.publicToken === 'string' ? body.publicToken.trim() : '';
  if (!publicToken) {
    return NextResponse.json({ error: 'publicToken is required' }, { status: 400 });
  }

  const lang = typeof body.lang === 'string' && isValidLocale(body.lang) ? body.lang : 'en';

  const expectedPublicToken = await getOrderPublicToken(orderId);
  if (!expectedPublicToken) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (!tokensEqual(expectedPublicToken, publicToken)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  await persistOrderAnalyticsContext(orderId, analyticsParsed.fields);

  const supabasePayment = await getSupabasePaymentStatusByOrderId(orderId);
  const paymentStatus = (supabasePayment?.payment_status ?? order.status ?? '').toUpperCase();
  if (paymentStatus === 'PAID') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  const baseUrl = getBaseUrl();
  const metadata = buildStripeOrderMetadata({
    orderId: order.orderId,
    source: 'lanna_bloom_order_page',
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

  const baseSuccessUrl = stripeOrderSuccessUrl(baseUrl, orderId);
  const successUrl =
    expectedPublicToken && expectedPublicToken.trim()
      ? `${baseSuccessUrl}&token=${encodeURIComponent(publicToken.trim())}`
      : baseSuccessUrl;
  const cancelUrl = getOrderDetailsUrl(orderId, { token: expectedPublicToken });

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    client_reference_id: order.orderId,
    customer_email: order.customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    payment_intent_data: { metadata },
  };

  const session = await stripe.checkout.sessions.create(
    sessionParams,
    {
      idempotencyKey: `order-page-${orderId}-${stripeIdempotencyFingerprint(sessionParams)}`,
    }
  );

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url, orderId: order.orderId });
}
