/**
 * One admin "new order" email per order (idempotent via admin_notified).
 * Stripe checkout: sent when payment succeeds (webhook or sync-checkout-session).
 * Custom / manual flows may still send at creation where applicable.
 * Do NOT send from mark-paid for Stripe (webhook handles payment).
 *
 * Post-delivery customer email: idempotent via delivered_email_sent_at (see sendDeliveredCustomerEmailOnce).
 */

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendMinimalAdminNewOrderEmail, sendOrderDeliveredCustomerEmail } from '@/lib/orderEmail';
import { normalizeOrderStatus } from '@/lib/orders/statusConstants';

const CUSTOMER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/**
 * Send at most one post-delivery email per order when status becomes DELIVERED (admin dashboard).
 * Uses delivered_email_sent_at as an atomic claim; clears it if Resend fails so a later edit can retry.
 */
export async function sendDeliveredCustomerEmailOnce(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[orderNotification] Supabase not configured; skipping delivered email');
    return;
  }

  const trimmedId = orderId.trim();
  if (!trimmedId) return;

  const { data: row, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, order_status, customer_email, delivered_email_sent_at')
    .eq('order_id', trimmedId)
    .single();

  if (fetchError || !row) {
    console.error('[orderNotification] Delivered email prefetch failed:', fetchError?.message);
    return;
  }

  if (normalizeOrderStatus(row.order_status) !== 'DELIVERED') return;
  if (row.delivered_email_sent_at) return;

  const email = row.customer_email?.trim();
  if (!email || !CUSTOMER_EMAIL_RE.test(email)) return;

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ delivered_email_sent_at: now, updated_at: now })
    .eq('order_id', trimmedId)
    .is('delivered_email_sent_at', null)
    .select('order_id')
    .maybeSingle();

  if (claimError) {
    console.error('[orderNotification] Delivered email claim failed:', claimError.message);
    return;
  }
  if (!claimed) {
    return;
  }

  try {
    const { getOrderById } = await import('@/lib/orders');
    const order = await getOrderById(trimmedId);
    if (!order) {
      await supabase
        .from('orders')
        .update({ delivered_email_sent_at: null, updated_at: new Date().toISOString() })
        .eq('order_id', trimmedId);
      return;
    }

    const ok = await sendOrderDeliveredCustomerEmail(order);
    if (!ok) {
      await supabase
        .from('orders')
        .update({ delivered_email_sent_at: null, updated_at: new Date().toISOString() })
        .eq('order_id', trimmedId);
    }
  } catch (e) {
    console.error('[orderNotification] Delivered customer email failed:', e);
    await supabase
      .from('orders')
      .update({ delivered_email_sent_at: null, updated_at: new Date().toISOString() })
      .eq('order_id', trimmedId);
  }
}
