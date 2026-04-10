/**
 * Send GA4 purchase for an order exactly once (idempotent).
 * Called when order status becomes paid (admin payment-status, mark-paid, or Stripe webhook).
 *
 * Race-condition safety: an atomic conditional UPDATE claims the send lock before
 * the HTTP call, so concurrent callers cannot both send.
 */

import 'server-only';
import { getOrderById } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendPurchaseToGA4 } from './measurementProtocol';

export type SendPurchaseResult =
  | { sent: true }
  | { sent: false; reason: 'already_sent' }
  | { sent: false; reason: 'order_not_found' }
  | { sent: false; reason: 'ga4_not_configured' }
  | { sent: false; reason: 'send_failed'; error: string };

export type PurchaseSource =
  | 'stripe_webhook'
  | 'stripe_sync_checkout'
  | 'stripe_order_status'
  | 'admin_mark_paid'
  | 'admin_payment_status';

/**
 * If the order is paid and GA4 purchase has not been sent yet, send it and mark sent.
 * Otherwise skip and log clearly.
 *
 * @param orderId  The order to send purchase for.
 * @param source   Which code path triggered this call (for logging / debugging).
 */
export async function sendPurchaseForOrder(
  orderId: string,
  source: PurchaseSource = 'admin_mark_paid',
): Promise<SendPurchaseResult> {
  const normalized = String(orderId ?? '').trim();
  if (!normalized) {
    console.warn('[ga4/sendPurchaseForOrder] empty orderId, skipped');
    return { sent: false, reason: 'order_not_found' };
  }

  const tag = `[ga4/purchase][${source}][${normalized}]`;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn(`${tag} Supabase not configured, cannot check or set ga4_purchase_sent`);
    const order = await getOrderById(normalized);
    if (!order) return { sent: false, reason: 'order_not_found' };
    const result = await sendOne(normalized, order, null);
    console.log(`${tag} result (no-DB fallback):`, result.sent ? 'SENT' : `SKIPPED(${result.sent === false ? result.reason : ''})`);
    return result;
  }

  // --- Atomic claim: SET ga4_purchase_sent = true WHERE still false AND payment is PAID ---
  // This prevents the TOCTOU race where two concurrent calls both read false.
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({
      ga4_purchase_sent: true,
      ga4_purchase_sent_at: now,
    })
    .eq('order_id', normalized)
    .eq('payment_status', 'PAID')
    .eq('ga4_purchase_sent', false)
    .select('order_id, ga_client_id')
    .maybeSingle();

  if (claimError) {
    console.error(`${tag} claim UPDATE failed`, claimError.message);
    return { sent: false, reason: 'send_failed', error: claimError.message };
  }

  if (!claimed) {
    // Either payment_status != PAID, or ga4_purchase_sent was already true.
    // Distinguish for logging.
    const { data: row } = await supabase
      .from('orders')
      .select('payment_status, ga4_purchase_sent')
      .eq('order_id', normalized)
      .single();

    if (!row) {
      console.warn(`${tag} order not found in DB`);
      return { sent: false, reason: 'order_not_found' };
    }
    if ((row.payment_status ?? '').toUpperCase() !== 'PAID') {
      console.log(`${tag} SKIPPED — payment_status is "${row.payment_status}", not PAID`);
      return { sent: false, reason: 'order_not_found' };
    }
    console.log(`${tag} SKIPPED — duplicate prevented (ga4_purchase_sent already true)`);
    return { sent: false, reason: 'already_sent' };
  }

  // We claimed the lock. Now send.
  const order = await getOrderById(normalized);
  if (!order) {
    console.warn(`${tag} order not found after claim — rolling back flag`);
    await supabase
      .from('orders')
      .update({ ga4_purchase_sent: false, ga4_purchase_sent_at: null })
      .eq('order_id', normalized);
    return { sent: false, reason: 'order_not_found' };
  }

  const result = await sendOne(normalized, order, claimed.ga_client_id ?? null);

  if (!result.sent) {
    // Send failed — roll back so a retry can succeed later.
    console.warn(`${tag} GA4 send FAILED, rolling back ga4_purchase_sent`, (result as { error?: string }).error);
    await supabase
      .from('orders')
      .update({ ga4_purchase_sent: false, ga4_purchase_sent_at: null })
      .eq('order_id', normalized);
  } else {
    console.log(`${tag} GA4 purchase SENT successfully`);
  }

  return result;
}

async function sendOne(
  orderId: string,
  order: Awaited<ReturnType<typeof getOrderById>>,
  gaClientId: string | null
): Promise<SendPurchaseResult> {
  if (!order) return { sent: false, reason: 'order_not_found' };
  const value = order.pricing?.grandTotal ?? 0;
  const items = (order.items ?? []).map((it, i) => ({
    item_id: it.bouquetId,
    item_name: it.bouquetTitle ?? '',
    price: it.price ?? 0,
    quantity: 1,
    index: i,
    item_variant: it.size ?? undefined,
    currency: 'THB' as const,
  }));

  if (items.length === 0) {
    console.warn('[ga4/sendPurchaseForOrder] order has no items, skipping send', orderId);
    return { sent: false, reason: 'send_failed', error: 'No items' };
  }

  const result = await sendPurchaseToGA4({
    transactionId: orderId,
    value,
    currency: 'THB',
    items,
    clientId: gaClientId,
  });

  if (result.ok) return { sent: true };
  return {
    sent: false,
    reason: 'send_failed',
    error: result.error ?? `HTTP ${result.statusCode ?? 'unknown'}`,
  };
}
