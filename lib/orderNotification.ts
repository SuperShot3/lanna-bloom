/**
 * One admin "new order" email per order (idempotent via admin_notified).
 * Stripe checkout: sent when payment succeeds (webhook or sync-checkout-session).
 * Custom / manual flows may still send at creation where applicable.
 * Do NOT send from mark-paid for Stripe (webhook handles payment).
 *
 * Post-delivery customer email: idempotent via delivered_email_sent_at (see sendDeliveredCustomerEmailOnce).
 */

import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  sendAdminPaymentFailedEmail,
  sendCustomerPaymentFailedEmail,
  sendMinimalAdminNewOrderEmail,
  sendOrderDeliveredCustomerEmail,
} from '@/lib/orderEmail';
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

/**
 * Send at most one Stripe-payment-failed notification per order:
 *   - customer email with retry guidance (different card / PromptPay) and a link back to the order page
 *   - admin email so ops can follow up in chat
 *
 * Atomically claims `payment_failed_email_sent_at` to dedupe across multiple Stripe events
 * (e.g. async_payment_failed followed later by checkout.session.expired). Skips entirely if
 * the order is already paid. Clears the claim if Resend fails so a later event can retry.
 */
export async function sendPaymentFailedNotificationsOnce(params: {
  orderId: string;
  reason: 'async_payment_failed' | 'session_expired';
  lang?: 'en' | 'th';
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[orderNotification] Supabase not configured; skipping payment-failed email');
    return;
  }

  const trimmedId = params.orderId.trim();
  if (!trimmedId) return;

  const { data: row, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, payment_status, customer_email, payment_failed_email_sent_at')
    .eq('order_id', trimmedId)
    .single();

  if (fetchError || !row) {
    console.error(
      '[orderNotification] Payment-failed email prefetch failed:',
      fetchError?.message
    );
    return;
  }

  if (String(row.payment_status ?? '').toUpperCase() === 'PAID') return;
  if (row.payment_failed_email_sent_at) return;

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ payment_failed_email_sent_at: now, updated_at: now })
    .eq('order_id', trimmedId)
    .is('payment_failed_email_sent_at', null)
    .select('order_id')
    .maybeSingle();

  if (claimError) {
    console.error('[orderNotification] Payment-failed email claim failed:', claimError.message);
    return;
  }
  if (!claimed) {
    return;
  }

  // The claim is keyed to the CUSTOMER email since that's the user-visible one.
  // Admin email failures (rare; usually env config) are logged but don't release the claim,
  // otherwise we'd re-send the customer email on the next failure event.
  let customerOk = true;
  try {
    const { getOrderById, getOrderDetailsUrl } = await import('@/lib/orders');
    const order = await getOrderById(trimmedId);
    if (!order) {
      customerOk = false;
    } else {
      const retryUrl = getOrderDetailsUrl(trimmedId);
      const lang = params.lang === 'th' ? 'th' : 'en';
      customerOk = await sendCustomerPaymentFailedEmail(order, retryUrl, lang);
      void sendAdminPaymentFailedEmail(trimmedId, params.reason, order.customerEmail).catch(
        (e) => console.error('[orderNotification] Admin payment-failed email failed:', e)
      );
    }
  } catch (e) {
    console.error('[orderNotification] Payment-failed customer email failed:', e);
    customerOk = false;
  }

  if (!customerOk) {
    await supabase
      .from('orders')
      .update({ payment_failed_email_sent_at: null, updated_at: new Date().toISOString() })
      .eq('order_id', trimmedId);
  }
}
