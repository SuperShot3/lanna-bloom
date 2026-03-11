import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById } from '@/lib/orders';
import { getOrderIdFromStripeMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';

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
    const orderId =
      getOrderIdFromStripeMetadata(session.metadata) ??
      session.client_reference_id?.trim() ??
      getOrderIdFromStripeMetadata(paymentIntent?.metadata) ??
      null;
    if (!orderId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    console.log('[stripe/order-status] session checked', {
      sessionId: session.id,
      orderId,
      paymentStatus: session.payment_status,
      mode: stripeConfig.mode,
    });

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const status = order.status ?? 'processing';
    if (status === 'paid' || status === 'payment_failed') {
      return NextResponse.json({ status, order, orderId });
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
