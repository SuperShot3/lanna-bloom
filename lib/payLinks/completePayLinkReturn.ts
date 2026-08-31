import 'server-only';

import type Stripe from 'stripe';
import { getCheckoutDraftRecordById } from '@/lib/checkout/checkoutDrafts';
import {
  isAdminPayLinkOrder,
  payLinkDescriptionFromItems,
  STRIPE_PAY_LINK_SOURCE,
  type PayLinkReceipt,
} from '@/lib/payLinks/adminPayLink';
import { findPaidPayLinkOrderByPublicToken } from '@/lib/payLinks/listAdminPayLinks';
import { payLinkTokensEqual } from '@/lib/payLinks/payLinkCrypto';
import { fulfillPaidStripeCheckoutSession } from '@/lib/checkout/fulfillStripeCheckout';
import {
  getOrderById,
  getOrderByIdWithPublicToken,
  getOrderByStripeSessionId,
  getOrderPublicToken,
} from '@/lib/orders';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';

export type { PayLinkReceipt };

export type CompletePayLinkResult =
  | { kind: 'paid'; receipt: PayLinkReceipt }
  | { kind: 'pending' }
  | { kind: 'not_found' }
  | { kind: 'error'; error: string };

async function receiptFromOrder(
  order: {
    orderId: string;
    pricing?: { grandTotal?: number };
    items?: Array<{ bouquetTitle?: string; price?: number }>;
  },
  knownPublicToken?: string | null
): Promise<PayLinkReceipt> {
  const amount =
    order.pricing?.grandTotal ??
    order.items?.[0]?.price ??
    0;
  const fromKnown = knownPublicToken?.trim();
  const publicToken = fromKnown || (await getOrderPublicToken(order.orderId)) || undefined;
  return {
    amount,
    description: payLinkDescriptionFromItems(order.items),
    orderId: order.orderId,
    ...(publicToken ? { publicToken } : {}),
  };
}

function sessionBelongsToLink(session: Stripe.Checkout.Session, linkId: string): boolean {
  const draftId = typeof session.metadata?.checkout_draft_id === 'string'
    ? session.metadata.checkout_draft_id.trim()
    : '';
  const orderId = typeof session.metadata?.order_id === 'string' ? session.metadata.order_id.trim() : '';
  const ref = session.client_reference_id?.trim() ?? '';
  return draftId === linkId || orderId === linkId || ref === linkId;
}

export async function completePayLinkFromStripeSession(params: {
  linkId: string;
  publicToken: string;
  sessionId: string;
}): Promise<CompletePayLinkResult> {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) return { kind: 'error', error: 'Stripe is not configured' };

  const linkId = params.linkId.trim();
  const publicToken = params.publicToken.trim();
  const sessionId = params.sessionId.trim();
  if (!linkId || !publicToken || !sessionId) return { kind: 'not_found' };

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  } catch {
    return { kind: 'not_found' };
  }

  const source = (session.metadata?.source ?? '').trim();
  if (source && source !== STRIPE_PAY_LINK_SOURCE) return { kind: 'not_found' };
  if (!sessionBelongsToLink(session, linkId)) return { kind: 'not_found' };

  const draft = await getCheckoutDraftRecordById(linkId);
  const metaToken = typeof session.metadata?.pay_link_token === 'string' ? session.metadata.pay_link_token : '';
  let tokenOk = payLinkTokensEqual(metaToken, publicToken);

  if (draft && isAdminPayLinkOrder(draft.payload)) {
    if (!payLinkTokensEqual(draft.payload.payLinkPublicToken, publicToken)) {
      return { kind: 'not_found' };
    }
    tokenOk = true;
  } else if (!tokenOk) {
    const legacy = await getOrderByIdWithPublicToken(linkId, publicToken);
    const paidByToken = await findPaidPayLinkOrderByPublicToken(publicToken);
    if (legacy && isAdminPayLinkOrder(legacy)) tokenOk = true;
    if (paidByToken) tokenOk = true;
  }
  if (!tokenOk) return { kind: 'not_found' };

  const paymentIntent =
    typeof session.payment_intent === 'string' ? null : session.payment_intent;
  const paidInStripe =
    session.payment_status === 'paid' || paymentIntent?.status === 'succeeded';

  if (!paidInStripe) return { kind: 'pending' };

  const fulfill = await fulfillPaidStripeCheckoutSession({
    stripe,
    session,
    trigger: 'order_status',
  });
  if (fulfill.kind === 'error') {
    return { kind: 'error', error: fulfill.message };
  }
  if (fulfill.kind === 'pending_payment') return { kind: 'pending' };

  const order =
    (await getOrderById(fulfill.orderId)) ?? (await getOrderByStripeSessionId(session.id));
  if (!order) return { kind: 'pending' };

  const expectedPayToken = order.payLinkPublicToken?.trim();
  if (expectedPayToken && !payLinkTokensEqual(expectedPayToken, publicToken)) {
    const paid = await findPaidPayLinkOrderByPublicToken(publicToken);
    if (!paid || paid.orderId !== order.orderId) return { kind: 'not_found' };
  }

  return { kind: 'paid', receipt: await receiptFromOrder(order) };
}

export async function paidPayLinkReceiptForToken(token: string): Promise<PayLinkReceipt | null> {
  const paid = await findPaidPayLinkOrderByPublicToken(token);
  if (!paid) return null;
  const order = await getOrderById(paid.orderId);
  const knownToken = paid.publicToken?.trim() || undefined;
  if (!order) {
    return {
      amount: paid.amount,
      description: paid.description,
      orderId: paid.orderId,
      ...(knownToken ? { publicToken: knownToken } : {}),
    };
  }
  return receiptFromOrder(order, knownToken);
}
