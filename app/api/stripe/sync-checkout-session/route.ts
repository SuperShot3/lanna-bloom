import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getOrderById,
  getOrderByStripeSessionId,
  updateOrderPaymentStatus,
} from '@/lib/orders';
import { getOrderDetailsUrl } from '@/lib/orders';
import { sendCustomerConfirmationEmail } from '@/lib/orderEmail';
import { logLineIntegrationEvent } from '@/lib/line-integration/log';
import { queuePaymentNotificationForAgent } from '@/lib/line-notifications/pendingPayment';
import { getOrderIdFromStripeMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Called from the order page after Stripe Checkout redirect when the webhook
 * has not updated the DB yet. Verifies the session with Stripe and marks the
 * order paid (same outcome as checkout.session.completed webhook).
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
  if (!sessionId || !expectedOrderId) {
    return NextResponse.json({ error: 'sessionId and orderId are required' }, { status: 400 });
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

  let orderId =
    getOrderIdFromStripeMetadata(session.metadata) ??
    session.client_reference_id?.trim() ??
    null;

  if (!orderId && paymentIntent) {
    orderId = getOrderIdFromStripeMetadata(paymentIntent.metadata);
  }

  if (!orderId) {
    return NextResponse.json({ error: 'Could not resolve order from session' }, { status: 400 });
  }

  if (orderId !== expectedOrderId) {
    return NextResponse.json({ error: 'Session does not match this order' }, { status: 403 });
  }

  const stripeSessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  const paidInStripe =
    session.payment_status === 'paid' || paymentIntent?.status === 'succeeded';

  if (!paidInStripe) {
    console.log('[stripe/purchase] sync-checkout-session: Stripe session not paid yet', {
      orderId,
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

  const existingBySession = await getOrderByStripeSessionId(stripeSessionId);
  if (existingBySession && existingBySession.orderId !== orderId) {
    console.error('[stripe/sync-checkout-session] session already bound to another order');
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'paid') {
    return NextResponse.json({ ok: true, paid: true, alreadyPaid: true });
  }

  const paidAt = new Date().toISOString();
  const amountTotal = session.amount_total != null ? session.amount_total / 100 : undefined;
  const currency = session.currency?.toUpperCase();

  try {
    await updateOrderPaymentStatus(orderId, {
      status: 'paid',
      stripeSessionId,
      paymentIntentId,
      amountTotal,
      currency,
      paidAt,
    });

    void import('@/lib/supabase/orderAdapter').then(({ syncSupabasePaymentSuccess }) =>
      syncSupabasePaymentSuccess(orderId, paymentIntentId, paidAt, stripeSessionId).catch((err) => {
        console.error('[stripe/sync-checkout-session] dual-write sync error:', err);
      })
    );

    const updatedOrder = await getOrderById(orderId);
    if (updatedOrder) {
      const publicOrderUrl = getOrderDetailsUrl(orderId);
      sendCustomerConfirmationEmail(updatedOrder, publicOrderUrl).catch((e) => {
        console.error('[stripe/sync-checkout-session] confirmation email failed:', e);
      });

      const lineUid = updatedOrder.lineUserId?.trim();
      if (lineUid) {
        const { queued } = await queuePaymentNotificationForAgent(orderId, lineUid, publicOrderUrl);
        if (queued) {
          await logLineIntegrationEvent('payment_notify_queued_for_agent', {
            lineUserId: lineUid,
            orderId,
          });
        }
      }
    }

    // Create income record (idempotent, fire-and-forget — must not break payment flow)
    void import('@/lib/accounting/upsertOrderIncome').then(({ upsertOrderIncome }) =>
      upsertOrderIncome({
        orderId:               orderId,
        amount:                amountTotal ?? 0,
        currency:              currency ?? 'THB',
        paymentMethod:         'STRIPE',
        stripePaymentIntentId: paymentIntentId ?? null,
        createdBy:             'system:sync_checkout',
      }).catch((e) => console.error('[sync-checkout-session] income upsert error:', e))
    );

    console.log('[stripe/purchase] sync-checkout-session: order marked PAID in DB', { orderId, stripeSessionId });
    return NextResponse.json({ ok: true, paid: true });
  } catch (e) {
    console.error('[stripe/sync-checkout-session] update error:', e);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
