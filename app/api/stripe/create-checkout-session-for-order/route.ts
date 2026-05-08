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

export const dynamic = 'force-dynamic';

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
 * Body: { orderId: string, publicToken: string, lang?: 'en' | 'th' }
 * Returns: { url: string } to redirect the customer to Stripe Checkout.
 */
export async function POST(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  let body: { orderId?: string; publicToken?: string; lang?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const publicToken = typeof body.publicToken === 'string' ? body.publicToken.trim() : '';
  if (!publicToken) {
    return NextResponse.json({ error: 'publicToken is required' }, { status: 400 });
  }

  const lang = body.lang === 'th' || body.lang === 'en' ? body.lang : 'en';

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
