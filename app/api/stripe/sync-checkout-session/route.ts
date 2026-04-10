import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { fulfillPaidStripeCheckoutSession } from '@/lib/checkout/fulfillStripeCheckout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Called after Stripe Checkout redirect when the webhook has not finished yet.
 * Verifies the session with Stripe and creates + marks paid (cart) or marks paid (order page).
 * Body: { sessionId: string; orderId?: string } — orderId optional; if set, must match the session.
 */
export async function POST(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  let body: { sessionId?: string; orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const expectedOrderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
  } catch (e) {
    console.error('[stripe/sync-checkout-session] retrieve failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load session' },
      { status: 400 }
    );
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? null
      : (session.payment_intent as Stripe.PaymentIntent | null);

  const paidInStripe =
    session.payment_status === 'paid' || paymentIntent?.status === 'succeeded';

  if (!paidInStripe) {
    console.log('[stripe/purchase] sync-checkout-session: Stripe session not paid yet', {
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
    });
    return NextResponse.json({
      ok: true,
      paid: false,
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
    });
  }

  const fulfill = await fulfillPaidStripeCheckoutSession({
    stripe,
    session,
    trigger: 'sync_checkout',
  });

  if (fulfill.kind === 'pending_payment') {
    return NextResponse.json({
      ok: true,
      paid: false,
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
    });
  }

  if (fulfill.kind === 'error') {
    console.error('[stripe/sync-checkout-session] fulfill error:', fulfill.message);
    return NextResponse.json({ error: 'Could not complete checkout' }, { status: 500 });
  }

  const orderId = fulfill.orderId;

  if (expectedOrderId && expectedOrderId !== orderId) {
    return NextResponse.json({ error: 'Session does not match this order' }, { status: 403 });
  }

  console.log('[stripe/purchase] sync-checkout-session: order marked PAID in DB', {
    orderId,
    stripeSessionId: session.id,
  });
  return NextResponse.json({ ok: true, paid: true, orderId });
}
