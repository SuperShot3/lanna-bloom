import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById, getOrderByStripeSessionId } from '@/lib/orders';
import { getOrderIdFromStripeMetadata } from '@/lib/stripe/metadata';
import { resolveStripeCheckoutSessionIds } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { fulfillPaidStripeCheckoutSession } from '@/lib/checkout/fulfillStripeCheckout';

export async function GET(request: NextRequest) {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim(), {
      expand: ['payment_intent'],
    });

    const paymentIntent =
      typeof session.payment_intent === 'string' ? null : (session.payment_intent as Stripe.PaymentIntent | null);

    const paidInStripe =
      session.payment_status === 'paid' || paymentIntent?.status === 'succeeded';

    if (paidInStripe) {
      const fulfill = await fulfillPaidStripeCheckoutSession({
        stripe,
        session,
        trigger: 'order_status',
      });
      if (fulfill.kind === 'error') {
        console.error('[stripe/order-status] fulfill error:', fulfill.message, { sessionId: session.id });
      }
    }

    const { orderId: resolvedLbFromSession } = resolveStripeCheckoutSessionIds(session);
    let orderId =
      getOrderIdFromStripeMetadata(session.metadata) ??
      (session.client_reference_id?.trim().startsWith('LB-') ? session.client_reference_id.trim() : null) ??
      getOrderIdFromStripeMetadata(paymentIntent?.metadata) ??
      null;

    if (!orderId && resolvedLbFromSession?.startsWith('LB-')) {
      orderId = resolvedLbFromSession;
    }

    const foundByStripe = paidInStripe ? await getOrderByStripeSessionId(session.id) : null;

    if (!orderId && foundByStripe) {
      orderId = foundByStripe.orderId;
    }

    if (!orderId) {
      return NextResponse.json({
        status: paidInStripe ? 'processing' : 'pending',
        orderId: null,
        stripePaymentStatus: session.payment_status,
        paymentIntentStatus: paymentIntent?.status ?? null,
      });
    }

    console.log('[stripe/order-status] session checked', {
      sessionId: session.id,
      orderId,
      paymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
      mode: stripeConfig.mode,
    });

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({
        status: paidInStripe ? 'processing' : 'pending',
        orderId: null,
        stripePaymentStatus: session.payment_status,
        paymentIntentStatus: paymentIntent?.status ?? null,
      });
    }

    const status = order.status ?? 'processing';
    console.log('[stripe/order-status] backend order state', {
      sessionId: session.id,
      orderId,
      backendStatus: order.status ?? null,
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
      paidAt: order.paidAt ?? null,
    });

    if (status === 'paid' || status === 'payment_failed') {
      return NextResponse.json({ status, order, orderId });
    }

    if (session.payment_status === 'paid' || paymentIntent?.status === 'succeeded') {
      console.warn('[stripe/order-status] Stripe says paid but backend is not marked paid yet', {
        sessionId: session.id,
        orderId,
        backendStatus: order.status ?? null,
        stripePaymentStatus: session.payment_status,
        paymentIntentStatus: paymentIntent?.status ?? null,
      });
    }

    return NextResponse.json({
      status: 'processing',
      orderId,
      stripePaymentStatus: session.payment_status,
      paymentIntentStatus: paymentIntent?.status ?? null,
    });
  } catch (e) {
    console.error('[stripe/order-status] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get order status' },
      { status: 500 }
    );
  }
}
