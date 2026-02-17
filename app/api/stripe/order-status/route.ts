import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrderById } from '@/lib/orders';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId.trim());
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const status = order.status ?? 'processing';
    if (status === 'paid' || status === 'payment_failed') {
      return NextResponse.json({ status, order });
    }

    return NextResponse.json({ status: 'processing' });
  } catch (e) {
    console.error('[stripe/order-status] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get order status' },
      { status: 500 }
    );
  }
}
