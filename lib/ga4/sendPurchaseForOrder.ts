/**
 * Send GA4 purchase for an order exactly once (idempotent).
 * Called when order status becomes paid (admin payment-status, mark-paid, or Stripe webhook).
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

/**
 * If the order is paid and GA4 purchase has not been sent yet, send it and mark sent.
 * Otherwise skip and log clearly.
 */
export async function sendPurchaseForOrder(orderId: string): Promise<SendPurchaseResult> {
  const normalized = String(orderId ?? '').trim();
  if (!normalized) {
    console.warn('[ga4/sendPurchaseForOrder] empty orderId, skipped');
    return { sent: false, reason: 'order_not_found' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[ga4/sendPurchaseForOrder] Supabase not configured, cannot check or set ga4_purchase_sent');
    // Still try to send GA4 (idempotency is best-effort without DB)
    const order = await getOrderById(normalized);
    if (!order) return { sent: false, reason: 'order_not_found' };
    const result = await sendOne(normalized, order, null);
    return result;
  }

  const { data: row } = await supabase
    .from('orders')
    .select('payment_status, ga4_purchase_sent, ga_client_id')
    .eq('order_id', normalized)
    .single();

  const paymentStatus = (row?.payment_status ?? '').toUpperCase();
  if (paymentStatus !== 'PAID') {
    console.log('[ga4/sendPurchaseForOrder] skipped — payment_status is not PAID', normalized, paymentStatus || '(empty)');
    return { sent: false, reason: 'order_not_found' };
  }

  const alreadySent = row?.ga4_purchase_sent === true;
  if (alreadySent) {
    console.log('[ga4/sendPurchaseForOrder] duplicate prevented — purchase already sent for order', normalized);
    return { sent: false, reason: 'already_sent' };
  }

  const order = await getOrderById(normalized);
  if (!order) {
    console.warn('[ga4/sendPurchaseForOrder] order not found', normalized);
    return { sent: false, reason: 'order_not_found' };
  }

  const result = await sendOne(normalized, order, row?.ga_client_id ?? null);
  if (result.sent) {
    const { error } = await supabase
      .from('orders')
      .update({
        ga4_purchase_sent: true,
        ga4_purchase_sent_at: new Date().toISOString(),
      })
      .eq('order_id', normalized);
    if (error) {
      console.error('[ga4/sendPurchaseForOrder] failed to set ga4_purchase_sent', { orderId: normalized, error: error.message });
    }
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
