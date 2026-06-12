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
import { buildStripeOrderMetadata } from '@/lib/stripe/metadata';
import { runStripePostPaymentSuccessHooks } from '@/lib/stripe/postStripePaymentSuccess';
import { getPaymentIntentStripeFeeMajor } from '@/lib/stripe/getPaymentIntentStripeFeeMajor';
import { deleteCheckoutDraftById, getCheckoutDraftById } from '@/lib/checkout/checkoutDrafts';

export type FulfillStripeCheckoutResult =
  | { kind: 'order_ready'; orderId: string; order: Order; didCreate: boolean }
  | { kind: 'pending_payment'; reason: string }
  | { kind: 'error'; message: string };

async function tryBackfillStripeOrderId(params: {
  stripe: Stripe;
  stripeSessionId: string;
  paymentIntentId: string | null;
  existingSessionMetadata: Stripe.Metadata | Record<string, string> | null | undefined;
  orderId: string;
}) {
  const orderIdTrimmed = params.orderId.trim();
  if (!orderIdTrimmed) return;

  const orderMetadata = buildStripeOrderMetadata({
    orderId: orderIdTrimmed,
    source: 'lanna_bloom_post_payment',
  });

  // Ensure Checkout Session is marked with order id for Stripe reporting/search.
  // (Session metadata is visible in Dashboard + exports.)
  try {
    const mergedSessionMetadata: Record<string, string> = {
      ...(params.existingSessionMetadata ?? {}),
      ...orderMetadata,
    };
    await params.stripe.checkout.sessions.update(params.stripeSessionId, {
      metadata: mergedSessionMetadata,
    });
  } catch (e) {
    console.error('[fulfillStripeCheckout] session metadata backfill failed:', e, {
      stripeSessionId: params.stripeSessionId,
      orderId: orderIdTrimmed,
    });
  }

  // Ensure PaymentIntent is marked too (useful for payment_intent.* events / reports).
  if (params.paymentIntentId) {
    try {
      await params.stripe.paymentIntents.update(params.paymentIntentId, {
        metadata: orderMetadata,
      });
    } catch (e) {
      console.error('[fulfillStripeCheckout] payment intent metadata backfill failed:', e, {
        paymentIntentId: params.paymentIntentId,
        orderId: orderIdTrimmed,
      });
    }

    // Payments export is typically charge-centric; make sure the Charge is tagged too.
    try {
      const pi = await params.stripe.paymentIntents.retrieve(params.paymentIntentId, {
        expand: ['latest_charge'],
      });
      const latestCharge =
        typeof pi.latest_charge === 'string'
          ? null
          : (pi.latest_charge as Stripe.Charge | null);
      if (latestCharge?.id) {
        await params.stripe.charges.update(latestCharge.id, { metadata: orderMetadata });
      }
    } catch (e) {
      console.error('[fulfillStripeCheckout] charge metadata backfill failed:', e, {
        paymentIntentId: params.paymentIntentId,
        orderId: orderIdTrimmed,
      });
    }
  }
}

async function markOrderPaidFromSession(params: {
  stripe: Stripe;
  orderId: string;
  stripeSessionId: string;
  paymentIntentId: string | null;
  amountTotal: number | null | undefined;
  currency: string | undefined;
  trigger: 'stripe_webhook' | 'sync_checkout' | 'order_status';
}): Promise<Order | null> {
  const paidAt = new Date().toISOString();

  let paymentFeeMajor: number | undefined = undefined;
  if (params.paymentIntentId) {
    const resolved = await getPaymentIntentStripeFeeMajor(params.stripe, params.paymentIntentId);
    if (resolved != null) paymentFeeMajor = resolved;
  }

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
    paymentFeeMajor,
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
    stripeProcessingFeeMajor: paymentFeeMajor ?? null,
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
      stripe: params.stripe,
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
      stripe: params.stripe,
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

  // Cart flow creates the order AFTER Stripe payment, so Stripe won't have the order id at payment time.
  // Back-fill Stripe so Dashboard reports can be filtered by order id.
  await tryBackfillStripeOrderId({
    stripe: params.stripe,
    stripeSessionId,
    paymentIntentId,
    existingSessionMetadata: session.metadata,
    orderId: order.orderId,
  });

  const updated = await markOrderPaidFromSession({
    stripe: params.stripe,
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
