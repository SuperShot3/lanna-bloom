import 'server-only';

import Stripe from 'stripe';
import { getOrderBySubmissionToken, getPayLinkUrl, getPayLinkStripeSuccessUrl } from '@/lib/orders';
import {
  isAdminPayLinkOrder,
  payLinkUnusableReason,
  STRIPE_PAY_LINK_SOURCE,
} from '@/lib/payLinks/adminPayLink';
import {
  buildStablePayLinkCheckoutSessionParams,
  lookupStoredPayLinkCheckoutSession,
  payLinkCheckoutIdempotencyKey,
} from '@/lib/payLinks/payLinkCheckoutSession';
import { payLinkTokensEqual } from '@/lib/payLinks/payLinkCrypto';
import { expirePayLinkStripeSessionIfAny } from '@/lib/payLinks/expirePayLinkDrafts';
import { getCheckoutDraftRecordById, mergeCheckoutDraftPayload } from '@/lib/checkout/checkoutDrafts';
import { buildStripeCheckoutDraftMetadata } from '@/lib/stripe/metadata';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';
import { buildStripeCheckoutLineItems } from '@/lib/stripe/checkoutStripeLineItems';

export type CreatePayLinkDraftCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string; alreadyPaid?: boolean };

export async function createCheckoutSessionForPayLinkDraft(params: {
  draftId: string;
  publicToken: string;
  lang?: string;
}): Promise<CreatePayLinkDraftCheckoutResult> {
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) {
    return { ok: false, status: 500, error: 'Stripe is not configured' };
  }

  const draftId = params.draftId.trim();
  const publicToken = params.publicToken.trim();
  if (!draftId || !publicToken) {
    return { ok: false, status: 400, error: 'draftId and publicToken are required' };
  }

  const record = await getCheckoutDraftRecordById(draftId);
  if (!record) {
    return { ok: false, status: 404, error: 'Pay link not found' };
  }

  const payload = record.payload;
  if (!isAdminPayLinkOrder(payload)) {
    return { ok: false, status: 404, error: 'Pay link not found' };
  }

  if (!payLinkTokensEqual(payload.payLinkPublicToken, publicToken)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const unusable = payLinkUnusableReason(payload, record.createdAt);
  if (unusable) {
    await expirePayLinkStripeSessionIfAny(payload.payLinkStripeSessionId);
    return { ok: false, status: 410, error: 'This payment link is no longer active' };
  }

  const submissionToken = payload.submissionToken?.trim();
  if (submissionToken) {
    const existing = await getOrderBySubmissionToken(submissionToken);
    if (existing?.status === 'paid') {
      return {
        ok: false,
        status: 400,
        error: 'Already paid',
        alreadyPaid: true,
      };
    }
  }

  const amount = payload.pricing?.grandTotal ?? payload.items?.[0]?.price ?? 0;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, error: 'Invalid amount' };
  }

  const stripe = createStripeServerClient(stripeConfig.secretKey);
  const previousSessionId = payload.payLinkStripeSessionId?.trim();
  const stored = await lookupStoredPayLinkCheckoutSession(
    (id) => stripe.checkout.sessions.retrieve(id),
    previousSessionId
  );
  if (stored.kind === 'open') {
    return { ok: true, url: stored.url };
  }

  const lineItems = buildStripeCheckoutLineItems({
    computedItems: payload.items ?? [],
    deliveryFee: payload.pricing?.deliveryFee ?? 0,
    effectiveGrandTotal: amount,
    referralDiscount: 0,
  });

  const metadata = buildStripeCheckoutDraftMetadata({
    checkoutDraftId: draftId,
    submissionToken: submissionToken || draftId,
    source: STRIPE_PAY_LINK_SOURCE,
    customerEmail: payload.customerEmail,
    lang: params.lang === 'th' ? 'th' : 'en',
  });
  metadata.pay_link_token = publicToken;

  const sessionParams = buildStablePayLinkCheckoutSessionParams({
    lineItems,
    clientReferenceId: draftId,
    customerEmail: payload.customerEmail,
    successUrl: getPayLinkStripeSuccessUrl(draftId, publicToken),
    cancelUrl: getPayLinkUrl(draftId, { token: publicToken, cancelled: true }),
    metadata,
  });

  const deadSessionId = stored.kind === 'dead' ? stored.sessionId : null;
  const idempotencyKey = payLinkCheckoutIdempotencyKey('draft', draftId, deadSessionId);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create checkout session';
    console.error('[createCheckoutSessionForPayLinkDraft]', message);
    return { ok: false, status: 500, error: 'Failed to create checkout session' };
  }

  if (!session.url || session.status === 'expired') {
    return { ok: false, status: 410, error: 'This payment link is no longer active' };
  }

  if (previousSessionId && previousSessionId !== session.id) {
    await expirePayLinkStripeSessionIfAny(previousSessionId);
  }
  if (previousSessionId !== session.id) {
    await mergeCheckoutDraftPayload(draftId, { payLinkStripeSessionId: session.id });
  }

  return { ok: true, url: session.url };
}
