import 'server-only';

import type Stripe from 'stripe';
import {
  createOrder,
  getOrderById,
  getOrderByStripeSessionId,
  getOrderBySubmissionToken,
  updateOrderPaymentStatus,
  type Order,
} from '@/lib/orders';
import { resolveStripeCheckoutSessionIds } from '@/lib/stripe/metadata';
import { runStripePostPaymentSuccessHooks } from '@/lib/stripe/postStripePaymentSuccess';
import { deleteCheckoutDraftById, getCheckoutDraftById } from '@/lib/checkout/checkoutDrafts';

export type FulfillStripeCheckoutResult =
  | { kind: 'order_ready'; orderId: string; order: Order; didCreate: boolean }
  | { kind: 'pending_payment'; reason: string }
  | { kind: 'error'; message: string };

async function markOrderPaidFromSession(params: {
  orderId: string;
  stripeSessionId: string;
  paymentIntentId: string | null;
  amountTotal: number | null | undefined;
  currency: string | undefined;
  trigger: 'stripe_webhook' | 'sync_checkout' | 'order_status';
}): Promise<Order | null> {
  const paidAt = new Date().toISOString();
  await updateOrderPaymentStatus(params.orderId, {
    status: 'paid',
    stripeSessionId: params.stripeSessionId,
    paymentIntentId: params.paymentIntentId ?? undefined,
    amountTotal:
      params.amountTotal != null && params.amountTotal !== undefined
        ? params.amountTotal / 100
        : undefined,
    currency: params.currency?.toUpperCase(),
    paidAt,
  });

  await runStripePostPaymentSuccessHooks({
    orderId: params.orderId,
    amountTotal:
      params.amountTotal != null && params.amountTotal !== undefined
        ? params.amountTotal / 100
        : undefined,
    currency: params.currency,
    paymentIntentId: params.paymentIntentId,
    paidAt,
    stripeSessionId: params.stripeSessionId,
    trigger: params.trigger,
  });

  return getOrderById(params.orderId);
}

/**
 * After Stripe reports a successful payment, create the order from a checkout draft (cart flow)
 * or mark an existing order paid (order-page flow). Safe to call from webhook and from sync/poll paths.
 */
export async function fulfillPaidStripeCheckoutSession(params: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  trigger: 'stripe_webhook' | 'sync_checkout' | 'order_status';
}): Promise<FulfillStripeCheckoutResult> {
  const { session, trigger } = params;

  let paymentIntent: Stripe.PaymentIntent | null =
    typeof session.payment_intent === 'string' ? null : (session.payment_intent as Stripe.PaymentIntent | null);

  if (typeof session.payment_intent === 'string' && session.payment_intent) {
    try {
      paymentIntent = await params.stripe.paymentIntents.retrieve(session.payment_intent);
    } catch (e) {
      console.error('[fulfillStripeCheckout] payment intent retrieve failed:', e);
    }
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? paymentIntent?.id ?? null;

  const paidInStripe =
    session.payment_status === 'paid' || paymentIntent?.status === 'succeeded';

  if (!paidInStripe) {
    return {
      kind: 'pending_payment',
      reason: 'stripe_session_not_paid',
    };
  }

  const stripeSessionId = session.id;
  const amountTotal = session.amount_total ?? paymentIntent?.amount ?? undefined;
  const currency = session.currency ?? paymentIntent?.currency ?? undefined;

  const existingBySession = await getOrderByStripeSessionId(stripeSessionId);
  if (existingBySession?.status === 'paid') {
    return {
      kind: 'order_ready',
      orderId: existingBySession.orderId,
      order: existingBySession,
      didCreate: false,
    };
  }

  if (existingBySession) {
    const recovered = await markOrderPaidFromSession({
      orderId: existingBySession.orderId,
      stripeSessionId,
      paymentIntentId,
      amountTotal,
      currency,
      trigger,
    });
    if (recovered) {
      return {
        kind: 'order_ready',
        orderId: recovered.orderId,
        order: recovered,
        didCreate: false,
      };
    }
    return { kind: 'error', message: 'mark_paid_failed' };
  }

  const { orderId: metaOrderId, checkoutDraftId } = resolveStripeCheckoutSessionIds(session);

  const submissionTokenFromMeta =
    typeof session.metadata?.submission_token === 'string'
      ? session.metadata.submission_token.trim()
      : '';

  /** Order-page flow: metadata.order_id + LB client_reference_id */
  if (metaOrderId) {
    const order = await getOrderById(metaOrderId);
    if (!order) {
      return { kind: 'error', message: 'order_not_found' };
    }
    if (order.status === 'paid') {
      return { kind: 'order_ready', orderId: order.orderId, order, didCreate: false };
    }

    const updated = await markOrderPaidFromSession({
      orderId: metaOrderId,
      stripeSessionId,
      paymentIntentId,
      amountTotal,
      currency,
      trigger,
    });
    if (!updated) {
      return { kind: 'error', message: 'mark_paid_failed' };
    }
    return { kind: 'order_ready', orderId: updated.orderId, order: updated, didCreate: false };
  }

  /** Cart flow: checkout draft → create order, then mark paid */
  if (!checkoutDraftId) {
    return { kind: 'error', message: 'missing_checkout_draft_or_order' };
  }

  let payload = await getCheckoutDraftById(checkoutDraftId);

  if (!payload && submissionTokenFromMeta) {
    const byToken = await getOrderBySubmissionToken(submissionTokenFromMeta);
    if (byToken?.status === 'paid') {
      return {
        kind: 'order_ready',
        orderId: byToken.orderId,
        order: byToken,
        didCreate: false,
      };
    }
  }

  if (!payload) {
    const bySessionAgain = await getOrderByStripeSessionId(stripeSessionId);
    if (bySessionAgain) {
      return {
        kind: 'order_ready',
        orderId: bySessionAgain.orderId,
        order: bySessionAgain,
        didCreate: false,
      };
    }
    return { kind: 'error', message: 'checkout_draft_not_found' };
  }

  const submissionToken = payload.submissionToken?.trim();
  if (submissionToken) {
    const existingByToken = await getOrderBySubmissionToken(submissionToken);
    if (existingByToken?.status === 'paid') {
      await deleteCheckoutDraftById(checkoutDraftId);
      return {
        kind: 'order_ready',
        orderId: existingByToken.orderId,
        order: existingByToken,
        didCreate: false,
      };
    }
  }

  const { order, created } = await createOrder(payload);

  const updated = await markOrderPaidFromSession({
    orderId: order.orderId,
    stripeSessionId,
    paymentIntentId,
    amountTotal,
    currency,
    trigger,
  });

  await deleteCheckoutDraftById(checkoutDraftId);

  if (!updated) {
    return { kind: 'error', message: 'mark_paid_failed' };
  }

  return { kind: 'order_ready', orderId: updated.orderId, order: updated, didCreate: true };
}
