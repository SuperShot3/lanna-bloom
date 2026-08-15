import 'server-only';

import {
  isAdminPayLinkOrder,
  payLinkUnusableReason,
} from '@/lib/payLinks/adminPayLink';
import {
  getCheckoutDraftRecordById,
  listPayLinkCheckoutDrafts,
  mergeCheckoutDraftPayload,
} from '@/lib/checkout/checkoutDrafts';
import { createStripeServerClient, getStripeServerConfig } from '@/lib/stripe/server';

async function expireStripeCheckoutSession(sessionId: string): Promise<boolean> {
  const id = sessionId.trim();
  if (!id) return false;
  const stripeConfig = getStripeServerConfig();
  if (!stripeConfig) return false;
  const stripe = createStripeServerClient(stripeConfig.secretKey);
  try {
    await stripe.checkout.sessions.expire(id);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (/already expired|no longer.*expired|resource_missing/i.test(message)) {
      return false;
    }
    console.error('[expirePayLinkDrafts] sessions.expire failed:', message);
    return false;
  }
}

export async function expirePayLinkStripeSessionIfAny(sessionId: string | null | undefined): Promise<void> {
  if (!sessionId?.trim()) return;
  await expireStripeCheckoutSession(sessionId);
}

export async function disablePayLinkDraft(draftId: string): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  const record = await getCheckoutDraftRecordById(draftId);
  if (!record || !isAdminPayLinkOrder(record.payload)) {
    return { ok: false, status: 404, error: 'Pay link not found' };
  }
  if (!record.payload.payLinkDisabledAt?.trim()) {
    await mergeCheckoutDraftPayload(draftId, {
      payLinkDisabledAt: new Date().toISOString(),
    });
  }
  await expirePayLinkStripeSessionIfAny(record.payload.payLinkStripeSessionId);
  return { ok: true };
}

/** Expire Stripe Checkout for unpaid pay links past the 15-minute window (or already disabled). */
export async function expireOverduePayLinkDrafts(): Promise<{ checked: number; expiredSessions: number }> {
  const drafts = await listPayLinkCheckoutDrafts(200);
  let expiredSessions = 0;
  for (const draft of drafts) {
    const reason = payLinkUnusableReason(draft.payload, draft.createdAt);
    if (!reason) continue;
    const sessionId = draft.payload.payLinkStripeSessionId?.trim();
    if (!sessionId) continue;
    const did = await expireStripeCheckoutSession(sessionId);
    if (did) expiredSessions += 1;
  }
  return { checked: drafts.length, expiredSessions };
}
