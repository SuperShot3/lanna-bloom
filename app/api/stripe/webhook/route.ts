import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import {
  getOrderById,
  getOrderByStripeSessionId,
  updateOrderPaymentStatus,
} from '@/lib/orders';
import { getOrderDetailsUrl } from '@/lib/orders';
import { sendOrderNotificationEmail } from '@/lib/orderEmail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PAYMENT_SUCCESS_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
];
const PAYMENT_FAILED_EVENT = 'checkout.session.async_payment_failed';

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  if (
    !PAYMENT_SUCCESS_EVENTS.includes(event.type) &&
    event.type !== PAYMENT_FAILED_EVENT
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error('[stripe/webhook] No orderId in session metadata');
    return NextResponse.json({ error: 'Missing orderId in metadata' }, { status: 400 });
  }

  if (event.type === PAYMENT_FAILED_EVENT) {
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status === 'paid') {
      return NextResponse.json({ received: true });
    }
    await updateOrderPaymentStatus(orderId, { status: 'payment_failed' });
    return NextResponse.json({ received: true });
  }

  const existingBySession = await getOrderByStripeSessionId(session.id);
  if (existingBySession && existingBySession.orderId !== orderId) {
    console.error('[stripe/webhook] stripeSessionId already used by another order');
    return NextResponse.json({ error: 'Duplicate session' }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.status === 'paid') {
    return NextResponse.json({ received: true });
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
  const amountTotal = session.amount_total ?? undefined;
  const currency = session.currency ?? undefined;
  const paidAt = new Date().toISOString();

  await updateOrderPaymentStatus(orderId, {
    status: 'paid',
    stripeSessionId: session.id,
    paymentIntentId,
    amountTotal: amountTotal ? amountTotal / 100 : undefined,
    currency: currency?.toUpperCase(),
    paidAt,
  });

  const updatedOrder = await getOrderById(orderId);
  if (updatedOrder) {
    const publicOrderUrl = getOrderDetailsUrl(orderId);
    sendOrderNotificationEmail(updatedOrder, publicOrderUrl).catch((e) => {
      console.error('[stripe/webhook] Notification email failed:', e);
    });
  }

  return NextResponse.json({ received: true });
}
