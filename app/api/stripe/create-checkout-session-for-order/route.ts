import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById, getBaseUrl } from '@/lib/orders';
import { buildStripeOrderMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';

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
  const itemsTotal = order.pricing?.itemsTotal ?? 0;
  const deliveryFee = order.pricing?.deliveryFee ?? 0;
  const referralDiscount = order.referralDiscount ?? 0;
  const subtotal = itemsTotal + deliveryFee;
  const discountRatio = subtotal > 0 ? referralDiscount / subtotal : 0;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = (order.items ?? []).map(
    (item) => {
      const originalCents = Math.round(item.price * 100);
      const discountedCents = Math.max(
        0,
        Math.round(originalCents * (1 - discountRatio))
      );
      const productName =
        item.size === '—' || !item.size
          ? item.bouquetTitle
          : `${item.bouquetTitle} — ${item.size}`;
      return {
        price_data: {
          currency: 'thb',
          product_data: {
            name: productName,
            description:
              item.addOns?.cardType === 'premium' ? 'With premium message card' : undefined,
          },
          unit_amount: discountedCents,
        },
        quantity: 1,
      };
    }
  );

  if (deliveryFee > 0) {
    const feeCents = Math.round(deliveryFee * 100);
    const discountedFeeCents = Math.max(0, Math.round(feeCents * (1 - discountRatio)));
    lineItems.push({
      price_data: {
        currency: 'thb',
        product_data: {
          name:
            referralDiscount > 0 && order.referralCode
              ? `Delivery fee (referral: ${order.referralCode})`
              : 'Delivery fee',
        },
        unit_amount: discountedFeeCents,
      },
      quantity: 1,
    });
  }

  const currentTotalCents = lineItems.reduce(
    (sum, li) =>
      sum + ((li.price_data as { unit_amount?: number }).unit_amount ?? 0) * (li.quantity ?? 1),
    0
  );
  const targetCents = Math.round(grandTotal * 100);
  const diff = targetCents - currentTotalCents;
  if (diff !== 0 && lineItems.length > 0) {
    const first = lineItems[0];
    const pd = first.price_data as { unit_amount?: number };
    pd.unit_amount = Math.max(0, (pd.unit_amount ?? 0) + diff);
  }

  const successUrl = `${baseUrl}/order/${encodeURIComponent(orderId)}?stripe=success`;
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
