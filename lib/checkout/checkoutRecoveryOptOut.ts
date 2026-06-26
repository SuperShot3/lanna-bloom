import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { cancelCheckoutAbandonment } from '@/lib/checkout/abandonedCheckout';

export type CheckoutRecoveryOptOutResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'missing_token' | 'not_found' | 'db_unavailable' };

/** Token from recovery email → global opt-out + cancel pending abandonments for that email. */
export async function optOutCheckoutRecoveryByToken(
  token: string
): Promise<CheckoutRecoveryOptOutResult> {
  const t = token.trim();
  if (!t) return { ok: false, reason: 'missing_token' };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: 'db_unavailable' };

  const { data: row, error: qErr } = await supabase
    .from('checkout_abandonments')
    .select('id, customer_email, stripe_session_id')
    .eq('recovery_unsubscribe_token', t)
    .maybeSingle();

  if (qErr || !row?.customer_email) {
    return { ok: false, reason: 'not_found' };
  }

  const email = String(row.customer_email).trim().toLowerCase();

  const { error: optErr } = await supabase
    .from('checkout_recovery_email_opt_outs')
    .upsert({ email, opted_out_at: new Date().toISOString() }, { onConflict: 'email' });

  if (optErr) {
    console.error('[checkoutRecoveryOptOut] opt-out insert failed', { email, message: optErr.message });
    return { ok: false, reason: 'db_unavailable' };
  }

  const { data: pending, error: listErr } = await supabase
    .from('checkout_abandonments')
    .select('stripe_session_id')
    .eq('customer_email', email)
    .is('recovery_email_sent_at', null)
    .is('cancelled_at', null);

  if (!listErr && pending) {
    const seen = new Set<string>();
    for (const p of pending) {
      const sid = String(p.stripe_session_id ?? '').trim();
      if (!sid || seen.has(sid)) continue;
      seen.add(sid);
      await cancelCheckoutAbandonment({ stripeSessionId: sid });
    }
  }

  return { ok: true, email };
}
