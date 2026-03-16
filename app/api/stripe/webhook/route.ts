import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getOrderById,
  getOrderByStripeSessionId,
  updateOrderPaymentStatus,
} from '@/lib/orders';
import { getOrderDetailsUrl } from '@/lib/orders';
import { sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOrderIdFromStripeMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';

const PAYMENT_SUCCESS_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'payment_intent.succeeded',
];
const PAYMENT_FAILED_EVENT = 'checkout.session.async_payment_failed';

type StripePaymentContext = {
  orderId: string | null;
  stripeSessionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
};

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
export const runtime = 'nodejs';

async function resolveCheckoutSessionContext(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<StripePaymentContext> {
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  let orderId =
    getOrderIdFromStripeMetadata(session.metadata) ??
    session.client_reference_id?.trim() ??
    null;

  let paymentIntent: Stripe.PaymentIntent | null = null;
  if (!orderId && paymentIntentId) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      orderId = getOrderIdFromStripeMetadata(paymentIntent.metadata);
    } catch (error) {
      console.error('[stripe/webhook] Failed to retrieve payment intent for metadata lookup:', error);
    }
  }

  return {
    orderId,
    stripeSessionId: session.id,
    paymentIntentId,
    amountTotal: session.amount_total ?? paymentIntent?.amount_received ?? undefined,
    currency: session.currency ?? paymentIntent?.currency ?? undefined,
  };
}

function resolvePaymentIntentContext(paymentIntent: Stripe.PaymentIntent): StripePaymentContext {
  return {
    orderId: getOrderIdFromStripeMetadata(paymentIntent.metadata),
    paymentIntentId: paymentIntent.id,
    amountTotal: paymentIntent.amount_received || paymentIntent.amount || undefined,
    currency: paymentIntent.currency ?? undefined,
  };
}

export async function POST(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig?.webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 });
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  let event: Stripe.Event;
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeConfig.webhookSecret
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log('[stripe/webhook] event received', {
    eventId: event.id,
    eventType: event.type,
    mode: stripeConfig.mode,
  });

  if (
    !PAYMENT_SUCCESS_EVENTS.includes(event.type) &&
    event.type !== PAYMENT_FAILED_EVENT
  ) {
    return NextResponse.json({ received: true });
  }

  console.log('[stripe/webhook] signature verified', {
    eventId: event.id,
    eventType: event.type,
  });

  const eventObject = event.data.object;
  const paymentContext =
    event.type === 'payment_intent.succeeded'
      ? resolvePaymentIntentContext(eventObject as Stripe.PaymentIntent)
      : await resolveCheckoutSessionContext(stripe, eventObject as Stripe.Checkout.Session);
  const { orderId, stripeSessionId, paymentIntentId, amountTotal, currency } = paymentContext;

  console.log('[stripe/webhook] resolved payment context', {
    eventId: event.id,
    eventType: event.type,
    orderId,
    stripeSessionId,
    paymentIntentId,
    amountTotal,
    currency,
  });

  if (!orderId) {
    console.error('[stripe/webhook] Missing order_id/client_reference_id in Stripe event');
    return NextResponse.json({ error: 'Missing order_id in metadata' }, { status: 400 });
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
      console.log('[stripe/webhook] order found for payment_failed', {
        orderId,
        currentStatus: order.status,
      });
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

  if (event.type === 'checkout.session.completed') {
    const session = eventObject as Stripe.Checkout.Session;
    console.log('[stripe/webhook] checkout.session.completed payload', {
      eventId: event.id,
      orderId,
      sessionId: session.id,
      paymentStatus: session.payment_status,
      paymentIntent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    });
    if (session.payment_status !== 'paid') {
      console.log('[stripe/webhook] checkout.session.completed not paid yet', {
        eventId: event.id,
        orderId,
        paymentStatus: session.payment_status,
      });
      return NextResponse.json({ received: true });
    }
  }

  if (stripeSessionId) {
    const existingBySession = await getOrderByStripeSessionId(stripeSessionId);
    if (existingBySession && existingBySession.orderId !== orderId) {
      console.error('[stripe/webhook] stripeSessionId already used by another order');
      return NextResponse.json({ error: 'Duplicate session' }, { status: 400 });
    }
  }

  if (!(await recordStripeEventIfNew(event.id, event.type))) {
    console.log('[stripe/webhook] duplicate event skipped', {
      eventId: event.id,
      eventType: event.type,
      orderId,
    });
    return NextResponse.json({ received: true });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    console.error('[stripe/webhook] Order not found for payment success:', orderId);
    return NextResponse.json({ received: true }); // 200 to avoid retry
  }

  console.log('[stripe/webhook] order found for payment success', {
    orderId,
    currentStatus: order.status,
  });

  if (order.status === 'paid') {
    console.log('[stripe/webhook] payment success ignored because order already paid', {
      eventId: event.id,
      eventType: event.type,
      orderId,
      stripeSessionId,
      paymentIntentId,
    });
    return NextResponse.json({ received: true });
  }

  const paidAt = new Date().toISOString();

  try {
    await updateOrderPaymentStatus(orderId, {
      status: 'paid',
      stripeSessionId,
      paymentIntentId,
      amountTotal: amountTotal ? amountTotal / 100 : undefined,
      currency: currency?.toUpperCase(),
      paidAt,
    });

    console.log('[stripe/webhook] order updated successfully', {
      orderId,
      stripeSessionId,
      paymentIntentId,
      paidAt,
    });

    // Legacy dual-write: sync to Supabase when primary is Blob
    void import('@/lib/supabase/orderAdapter').then(({ syncSupabasePaymentSuccess }) =>
      syncSupabasePaymentSuccess(orderId, paymentIntentId, paidAt, stripeSessionId).catch((e) => {
        console.error('[stripe/webhook] Supabase payment sync error:', e);
      })
    );

    const updatedOrder = await getOrderById(orderId);
    if (updatedOrder) {
      const publicOrderUrl = getOrderDetailsUrl(orderId);
      // Payment-confirmation only: customer email and GA4. No admin email here (admin is notified once at order placement).
      sendCustomerConfirmationEmail(updatedOrder, publicOrderUrl).catch((e) => {
        console.error('[stripe/webhook] Customer confirmation email failed:', e);
      });
    }

    // GA4 purchase for Stripe: not sent from webhook. Purchase reaches GA4 only via browser
    // (user lands on order page → dataLayer purchase → GTM → GA4). Direct-to-GA4 send is
    // only when admin changes order status (mark-paid / payment-status).
  } catch (e) {
    console.error('[stripe/webhook] payment success handler error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
