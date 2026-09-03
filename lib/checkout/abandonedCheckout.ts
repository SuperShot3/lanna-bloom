import 'server-only';

import { nanoid } from 'nanoid';
import type { OrderPayload } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import { getBaseUrl } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  abandonedCheckoutCooldownCutoffIso,
  normalizeCheckoutRecoveryEmail,
} from '@/lib/checkout/abandonedCheckoutCooldown';

export { ABANDONED_CHECKOUT_EMAIL_COOLDOWN_HOURS } from '@/lib/checkout/abandonedCheckoutCooldown';

export const ABANDONED_CHECKOUT_RECOVERY_EXPIRY_DAYS = 3;
/** Default delay before recovery email (hours). Override with ABANDONED_CHECKOUT_DELAY_HOURS. */
export const ABANDONED_CHECKOUT_DELAY_HOURS_DEFAULT = 0.5;

function delayHours(): number {
  const raw = process.env.ABANDONED_CHECKOUT_DELAY_HOURS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n <= 168) return n;
  }
  return ABANDONED_CHECKOUT_DELAY_HOURS_DEFAULT;
}

export function buildCheckoutRecoveryUrl(lang: string, token: string): string {
  const base = getBaseUrl().replace(/\/$/, '');
  const locale = lang === 'th' ? 'th' : 'en';
  const qs = new URLSearchParams({ recover: token }).toString();
  return `${base}/${locale}/cart?${qs}`;
}

export function buildCheckoutRecoveryUnsubscribeUrl(token: string): string {
  const base = getBaseUrl().replace(/\/$/, '');
  const qs = new URLSearchParams({ token: token.trim() }).toString();
  return `${base}/checkout-recovery/unsubscribe?${qs}`;
}

/** Schedule a recovery email after Stripe session create (requires customer email + opt-in). */
export async function scheduleCheckoutAbandonment(params: {
  stripeSessionId: string;
  checkoutDraftId: string;
  submissionToken: string;
  customerEmail: string;
  customerName?: string;
  lang: Locale;
  payload: OrderPayload;
  recoveryEmailConsent: boolean;
  sessionCreatedAt?: Date;
}): Promise<void> {
  const email = normalizeCheckoutRecoveryEmail(params.customerEmail);
  if (!email || !params.recoveryEmailConsent) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[abandonedCheckout] Supabase not configured; skipping schedule');
    return;
  }

  const { data: optedOut } = await supabase
    .from('checkout_recovery_email_opt_outs')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (optedOut) return;

  await cancelOtherPendingAbandonmentsForEmail(email);

  const sessionCreatedAt = params.sessionCreatedAt ?? new Date();
  const scheduledFor = new Date(sessionCreatedAt.getTime() + delayHours() * 60 * 60 * 1000);
  const expiresAt = new Date(
    sessionCreatedAt.getTime() +
      ABANDONED_CHECKOUT_RECOVERY_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  const recoveryToken = nanoid(21);
  const recoveryUnsubscribeToken = nanoid(21);
  const lang = params.lang === 'th' ? 'th' : 'en';

  const { error } = await supabase.from('checkout_abandonments').insert({
    stripe_session_id: params.stripeSessionId.trim(),
    checkout_draft_id: params.checkoutDraftId,
    submission_token: params.submissionToken.trim() || null,
    recovery_token: recoveryToken,
    recovery_unsubscribe_token: recoveryUnsubscribeToken,
    recovery_email_consent: true,
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

/** Cancel other unsent abandonments for this email so only one pending recovery remains. */
export async function cancelOtherPendingAbandonmentsForEmail(
  email: string,
  exceptId?: string
): Promise<void> {
  const normalized = normalizeCheckoutRecoveryEmail(email);
  if (!normalized) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  let query = supabase
    .from('checkout_abandonments')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('customer_email', normalized)
    .is('recovery_email_sent_at', null)
    .is('cancelled_at', null);

  if (exceptId) {
    query = query.neq('id', exceptId);
  }

  const { error } = await query;
  if (error) {
    console.error('[abandonedCheckout] cancel other pending failed', {
      message: error.message,
    });
  }
}

/**
 * True if this email already received an abandoned-checkout send inside the cooldown.
 * Checks both abandonment claims and sent outbox rows (covers pre-lock historical sends).
 */
export async function hasRecentAbandonedCheckoutSend(
  email: string,
  now: Date = new Date()
): Promise<boolean> {
  const normalized = normalizeCheckoutRecoveryEmail(email);
  if (!normalized) return true;

  const supabase = getSupabaseAdmin();
  if (!supabase) return true;

  const cutoff = abandonedCheckoutCooldownCutoffIso(now);

  const { data: recentAbandonment } = await supabase
    .from('checkout_abandonments')
    .select('id')
    .eq('customer_email', normalized)
    .gte('recovery_email_sent_at', cutoff)
    .limit(1)
    .maybeSingle();
  if (recentAbandonment) return true;

  const { data: recentOutbox } = await supabase
    .from('email_outbox')
    .select('id')
    .eq('email_type', 'abandoned_checkout')
    .eq('status', 'sent')
    .eq('customer_email', normalized)
    .gte('sent_at', cutoff)
    .limit(1)
    .maybeSingle();
  return Boolean(recentOutbox);
}

/**
 * Atomically take the 24h per-email send slot.
 * Update succeeds when the previous send is older than the cooldown; otherwise insert.
 * Unique violation means another worker holds the slot.
 */
export async function acquireAbandonedCheckoutEmailRateLimit(
  email: string,
  abandonmentId: string
): Promise<boolean> {
  const normalized = normalizeCheckoutRecoveryEmail(email);
  if (!normalized || !abandonmentId) return false;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff = abandonedCheckoutCooldownCutoffIso(now);

  const { data: updated, error: updateError } = await supabase
    .from('checkout_recovery_email_rate_limits')
    .update({ last_sent_at: nowIso, abandonment_id: abandonmentId })
    .eq('email', normalized)
    .lt('last_sent_at', cutoff)
    .select('email');

  if (updateError) {
    console.error('[abandonedCheckout] rate limit update failed', {
      id: abandonmentId,
      message: updateError.message,
    });
    return false;
  }
  if (updated && updated.length > 0) return true;

  const { error: insertError } = await supabase
    .from('checkout_recovery_email_rate_limits')
    .insert({
      email: normalized,
      last_sent_at: nowIso,
      abandonment_id: abandonmentId,
    });

  if (!insertError) return true;
  if (insertError.code === '23505' || /duplicate key|unique constraint/i.test(insertError.message)) {
    return false;
  }
  console.error('[abandonedCheckout] rate limit insert failed', {
    id: abandonmentId,
    message: insertError.message,
  });
  return false;
}

export async function releaseAbandonedCheckoutEmailRateLimit(
  email: string,
  abandonmentId: string
): Promise<void> {
  const normalized = normalizeCheckoutRecoveryEmail(email);
  if (!normalized || !abandonmentId) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('checkout_recovery_email_rate_limits')
    .delete()
    .eq('email', normalized)
    .eq('abandonment_id', abandonmentId);

  if (error) {
    console.error('[abandonedCheckout] rate limit release failed', {
      id: abandonmentId,
      message: error.message,
    });
  }
}

export type CheckoutAbandonmentRow = {
  id: string;
  stripe_session_id: string;
  submission_token: string | null;
  recovery_token: string;
  recovery_unsubscribe_token: string | null;
  recovery_email_consent: boolean;
  customer_email: string;
  customer_name: string | null;
  lang: string;
  payload_json: OrderPayload;
  session_created_at: string;
  recovery_email_scheduled_for: string;
  recovery_email_sent_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
};
