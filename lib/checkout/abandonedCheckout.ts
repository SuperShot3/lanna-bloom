import 'server-only';

import { nanoid } from 'nanoid';
import type { OrderPayload } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import { getBaseUrl } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const ABANDONED_CHECKOUT_RECOVERY_EXPIRY_DAYS = 3;

function delayHours(): number {
  const raw = process.env.ABANDONED_CHECKOUT_DELAY_HOURS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n <= 168) return n;
  }
  return 3;
}

export function buildCheckoutRecoveryUrl(lang: string, token: string): string {
  const base = getBaseUrl().replace(/\/$/, '');
  const locale = lang === 'th' ? 'th' : 'en';
  const qs = new URLSearchParams({ recover: token }).toString();
  return `${base}/${locale}/cart?${qs}`;
}

/** Schedule a recovery email after Stripe session create (requires customer email). */
export async function scheduleCheckoutAbandonment(params: {
  stripeSessionId: string;
  checkoutDraftId: string;
  submissionToken: string;
  customerEmail: string;
  customerName?: string;
  lang: Locale;
  payload: OrderPayload;
  sessionCreatedAt?: Date;
}): Promise<void> {
  const email = params.customerEmail.trim().toLowerCase();
  if (!email) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[abandonedCheckout] Supabase not configured; skipping schedule');
    return;
  }

  const sessionCreatedAt = params.sessionCreatedAt ?? new Date();
  const scheduledFor = new Date(sessionCreatedAt.getTime() + delayHours() * 60 * 60 * 1000);
  const expiresAt = new Date(
    sessionCreatedAt.getTime() +
      ABANDONED_CHECKOUT_RECOVERY_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  const recoveryToken = nanoid(21);
  const lang = params.lang === 'th' ? 'th' : 'en';

  const { error } = await supabase.from('checkout_abandonments').insert({
    stripe_session_id: params.stripeSessionId.trim(),
    checkout_draft_id: params.checkoutDraftId,
    submission_token: params.submissionToken.trim() || null,
    recovery_token: recoveryToken,
    customer_email: email,
    customer_name: params.customerName?.trim() || null,
    lang,
    payload_json: params.payload,
    session_created_at: sessionCreatedAt.toISOString(),
    recovery_email_scheduled_for: scheduledFor.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[abandonedCheckout] insert failed', {
      stripeSessionId: params.stripeSessionId,
      checkoutDraftId: params.checkoutDraftId,
      message: error.message,
    });
  }
}

/** Cancel abandonment when checkout is paid or definitively dead. */
export async function cancelCheckoutAbandonment(params: {
  stripeSessionId: string;
}): Promise<void> {
  const stripeSessionId = params.stripeSessionId.trim();
  if (!stripeSessionId) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('checkout_abandonments')
    .update({ cancelled_at: now })
    .eq('stripe_session_id', stripeSessionId)
    .is('cancelled_at', null);

  if (error) {
    console.error('[abandonedCheckout] cancel failed', {
      stripeSessionId,
      message: error.message,
    });
  }
}

/** Optimistic claim to prevent duplicate recovery emails across cron overlaps. */
export async function claimCheckoutAbandonmentEmailSend(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkout_abandonments')
    .update({ recovery_email_sent_at: now })
    .eq('id', id)
    .is('recovery_email_sent_at', null)
    .is('cancelled_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[abandonedCheckout] claim send failed', { id, message: error.message });
    return false;
  }
  return Boolean(data);
}

export async function releaseCheckoutAbandonmentEmailClaim(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from('checkout_abandonments')
    .update({ recovery_email_sent_at: null })
    .eq('id', id);
}

export type CheckoutAbandonmentRow = {
  id: string;
  stripe_session_id: string;
  submission_token: string | null;
  recovery_token: string;
  customer_email: string;
  customer_name: string | null;
  lang: string;
  payload_json: OrderPayload;
  recovery_email_scheduled_for: string;
  recovery_email_sent_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
};
