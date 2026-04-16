import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById, getOrderByStripeSessionId, updateOrderPaymentStatus } from '@/lib/orders';
import { getOrderIdFromStripeMetadata, resolveStripeCheckoutSessionIds } from '@/lib/stripe/metadata';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { fulfillPaidStripeCheckoutSession } from '@/lib/checkout/fulfillStripeCheckout';
import { deleteCheckoutDraftById } from '@/lib/checkout/checkoutDrafts';

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
    (session.client_reference_id?.trim().startsWith('LB-')
      ? session.client_reference_id.trim()
      : null) ??
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

  if (event.type === PAYMENT_FAILED_EVENT) {
    const session = eventObject as Stripe.Checkout.Session;
    const orderId =
      getOrderIdFromStripeMetadata(session.metadata) ??
      (session.client_reference_id?.trim().startsWith('LB-')
        ? session.client_reference_id.trim()
        : null);

    if (!orderId) {
      const draftId =
        typeof session.metadata?.checkout_draft_id === 'string'
          ? session.metadata.checkout_draft_id.trim()
          : '';
      if (draftId) {
        await deleteCheckoutDraftById(draftId).catch(() => {});
      }
      return NextResponse.json({ received: true });
    }

    if (!(await recordStripeEventIfNew(event.id, event.type))) {
      return NextResponse.json({ received: true });
    }
    try {
      const order = await getOrderById(orderId);
      if (!order) {
        console.error('[stripe/webhook] Order not found for payment_failed:', orderId);
        return NextResponse.json({ received: true });
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

  /** Resolve Checkout Session for success events (including payment_intent.succeeded via Checkout). */
  let session: Stripe.Checkout.Session | null = null;
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    session = eventObject as Stripe.Checkout.Session;
  } else if (event.type === 'payment_intent.succeeded') {
    const pi = eventObject as Stripe.PaymentIntent;
    const list = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
    session = list.data[0] ?? null;
    if (!session) {
      console.log('[stripe/webhook] payment_intent.succeeded: no Checkout Session for PI', {
        paymentIntentId: pi.id,
      });
      return NextResponse.json({ received: true });
    }
  }

  if (!session) {
    return NextResponse.json({ received: true });
  }

  const paymentContext =
    event.type === 'payment_intent.succeeded'
      ? resolvePaymentIntentContext(eventObject as Stripe.PaymentIntent)
      : await resolveCheckoutSessionContext(stripe, session);
  const { orderId, stripeSessionId } = paymentContext;

  console.log('[stripe/webhook] resolved payment context', {
    eventId: event.id,
    eventType: event.type,
    orderId,
    stripeSessionId,
    paymentIntentId: paymentContext.paymentIntentId,
    amountTotal: paymentContext.amountTotal,
    currency: paymentContext.currency,
  });

  if (event.type === 'checkout.session.completed') {
    const s = eventObject as Stripe.Checkout.Session;
    console.log('[stripe/webhook] checkout.session.completed payload', {
      eventId: event.id,
      orderId,
      sessionId: s.id,
      paymentStatus: s.payment_status,
      paymentIntent:
        typeof s.payment_intent === 'string'
          ? s.payment_intent
          : s.payment_intent?.id ?? null,
    });
    if (s.payment_status !== 'paid') {
      console.log('[stripe/webhook] checkout.session.completed not paid yet', {
        eventId: event.id,
        orderId,
        paymentStatus: s.payment_status,
      });
      return NextResponse.json({ received: true });
    }
  }

  const { orderId: resolvedOrderId } = resolveStripeCheckoutSessionIds(session);
  if (stripeSessionId && resolvedOrderId) {
    const existingBySession = await getOrderByStripeSessionId(stripeSessionId);
    if (existingBySession && existingBySession.orderId !== resolvedOrderId) {
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

  try {
    const result = await fulfillPaidStripeCheckoutSession({
      stripe,
      session,
      trigger: 'stripe_webhook',
    });

    if (result.kind === 'pending_payment') {
      console.log('[stripe/webhook] fulfill pending (not paid in Stripe yet)', {
        eventId: event.id,
        sessionId: session.id,
      });
      return NextResponse.json({ received: true });
    }

    if (result.kind === 'error') {
      console.error('[stripe/webhook] fulfill error:', result.message, {
        eventId: event.id,
        sessionId: session.id,
      });
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }

    console.log('[stripe/webhook] fulfill ok', {
      orderId: result.orderId,
      didCreate: result.didCreate,
      sessionId: session.id,
    });
  } catch (e) {
    console.error('[stripe/webhook] payment success handler error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
