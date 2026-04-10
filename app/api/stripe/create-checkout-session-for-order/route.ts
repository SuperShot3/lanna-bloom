import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById, getBaseUrl } from '@/lib/orders';
import { buildStripeOrderMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import {
  buildStripeCheckoutLineItems,
  stripeOrderSuccessUrl,
} from '@/lib/stripe/checkoutStripeLineItems';

export const dynamic = 'force-dynamic';

/**
 * Create a Stripe Checkout Session for an existing order (e.g. from the order page "Pay with Card").
 * Body: { orderId: string, lang?: 'en' | 'th' }
 * Returns: { url: string } to redirect the customer to Stripe Checkout.
 */
export async function POST(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  let body: { orderId?: string; lang?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const lang = body.lang === 'th' || body.lang === 'en' ? body.lang : 'en';

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

  const grandTotal = order.pricing?.grandTotal ?? order.amountTotal ?? 0;
  const deliveryFee = order.pricing?.deliveryFee ?? 0;
  const referralDiscount = order.referralDiscount ?? 0;

  const lineItems = buildStripeCheckoutLineItems({
    computedItems: order.items ?? [],
    deliveryFee,
    effectiveGrandTotal: grandTotal,
    referralCode: order.referralCode,
    referralDiscount,
  });

  const successUrl = stripeOrderSuccessUrl(baseUrl, orderId);
  const cancelUrl = `${baseUrl}/order/${encodeURIComponent(orderId)}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: order.orderId,
      customer_email: order.customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: { metadata },
    },
    { idempotencyKey: `order-page-${orderId}` }
  );

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url, orderId: order.orderId });
}
