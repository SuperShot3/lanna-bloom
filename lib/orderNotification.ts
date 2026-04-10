/**
 * One admin "new order" email per order (idempotent via admin_notified).
 * Stripe checkout: sent when payment succeeds (webhook or sync-checkout-session).
 * Custom / manual flows may still send at creation where applicable.
 * Do NOT send from mark-paid for Stripe (webhook handles payment).
 */

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendMinimalAdminNewOrderEmail } from '@/lib/orderEmail';

/**
 * Send exactly one admin "new order" email for this order, then set admin_notified.
 * Safe to call on retries or refresh: if admin_notified is already true, skips send.
 * If send fails, admin_notified is not set and the failure is logged.
 */
export async function sendAdminNewOrderNotificationOnce(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[orderNotification] Supabase not configured; skipping admin new-order email');
    return;
  }

  const trimmedId = orderId.trim();
  if (!trimmedId) return;

  try {
    const { data: row, error: fetchError } = await supabase
      .from('orders')
      .select('admin_notified')
      .eq('order_id', trimmedId)
      .single();

    if (fetchError) {
      console.error('[orderNotification] Failed to read order admin_notified:', fetchError.message);
      return;
    }

    if (row?.admin_notified === true) {
      return; // Idempotent: already sent
    }

    await sendMinimalAdminNewOrderEmail(trimmedId);

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({ admin_notified: true, admin_notified_at: now, updated_at: now })
      .eq('order_id', trimmedId);

    if (updateError) {
      console.error(
        '[orderNotification] Admin email was sent but failed to set admin_notified:',
        updateError.message
      );
      return;
    }
  } catch (e) {
    console.error('[orderNotification] Admin new-order email send failed:', e);
    // Do not set admin_notified so a retry can send again
  }
}
