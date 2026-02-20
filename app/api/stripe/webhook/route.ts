import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import {
  getOrderById,
  getOrderByStripeSessionId,
  updateOrderPaymentStatus,
} from '@/lib/orders';
import { getOrderDetailsUrl } from '@/lib/orders';
import { sendOrderNotificationEmail, sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const PAYMENT_SUCCESS_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
];
const PAYMENT_FAILED_EVENT = 'checkout.session.async_payment_failed';

/**
 * Record event for idempotency. Returns false if event already exists (duplicate).
 * Caller should return 200 without processing when false.
 */
async function recordStripeEventIfNew(eventId: string, type: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return true; // No idempotency table - process
  try {
    const { error } = await supabase.from('stripe_events').insert({
      event_id: eventId,
      type,
    });
    if (error) {
      if (error.code === '23505') return false; // Unique violation = already processed
      console.error('[stripe/webhook] stripe_events insert error:', error.message);
      return true; // Process anyway on other errors
    }
    return true;
  } catch (e) {
    console.error('[stripe/webhook] Failed to record stripe_events:', e);
    return true;
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);
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
      webhookSecret
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
    if (!(await recordStripeEventIfNew(event.id, event.type))) {
      return NextResponse.json({ received: true });
    }
    try {
      const order = await getOrderById(orderId);
      if (!order) {
        console.error('[stripe/webhook] Order not found for payment_failed:', orderId);
        return NextResponse.json({ received: true }); // 200 to avoid retry - order may be in Blob only
      }
      if (order.status === 'paid') {
        return NextResponse.json({ received: true });
      }
      await updateOrderPaymentStatus(orderId, { status: 'payment_failed' });
      void import('@/lib/supabase/orderAdapter').then(({ syncSupabasePaymentFailed }) =>
        syncSupabasePaymentFailed(orderId).catch((e) => {
          console.error('[stripe/webhook] Supabase payment_failed sync error:', e);
        })
      );
    } catch (e) {
      console.error('[stripe/webhook] payment_failed handler error:', e);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  const existingBySession = await getOrderByStripeSessionId(session.id);
  if (existingBySession && existingBySession.orderId !== orderId) {
    console.error('[stripe/webhook] stripeSessionId already used by another order');
    return NextResponse.json({ error: 'Duplicate session' }, { status: 400 });
  }

  if (!(await recordStripeEventIfNew(event.id, event.type))) {
    return NextResponse.json({ received: true });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    console.error('[stripe/webhook] Order not found for payment success:', orderId);
    return NextResponse.json({ received: true }); // 200 to avoid retry
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

  try {
    await updateOrderPaymentStatus(orderId, {
      status: 'paid',
      stripeSessionId: session.id,
      paymentIntentId,
      amountTotal: amountTotal ? amountTotal / 100 : undefined,
      currency: currency?.toUpperCase(),
      paidAt,
    });

    // Legacy dual-write: sync to Supabase when primary is Blob
    void import('@/lib/supabase/orderAdapter').then(({ syncSupabasePaymentSuccess }) =>
      syncSupabasePaymentSuccess(orderId, paymentIntentId, paidAt).catch((e) => {
        console.error('[stripe/webhook] Supabase payment sync error:', e);
      })
    );

    const updatedOrder = await getOrderById(orderId);
    if (updatedOrder) {
      const publicOrderUrl = getOrderDetailsUrl(orderId);
      sendOrderNotificationEmail(updatedOrder, publicOrderUrl).catch((e) => {
        console.error('[stripe/webhook] Notification email failed:', e);
      });
      sendCustomerConfirmationEmail(updatedOrder, publicOrderUrl).catch((e) => {
        console.error('[stripe/webhook] Customer confirmation email failed:', e);
      });
    }
  } catch (e) {
    console.error('[stripe/webhook] payment success handler error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
