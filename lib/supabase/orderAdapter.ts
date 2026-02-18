import 'server-only';
import { nanoid } from 'nanoid';
import { getSupabaseAdmin } from './server';
import type { Order } from '@/lib/orders';

export type DeliveryWindow =
  | 'MORNING_9_12'
  | 'MIDDAY_12_15'
  | 'AFTERNOON_15_18'
  | 'EVENING_18_20';

export type SupabaseOrderStatus =
  | 'NEW'
  | 'PAID'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_DISPATCH'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELED'
  | 'REFUNDED';

export type SupabasePaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

function mapPreferredTimeSlotToWindow(slot: string): DeliveryWindow {
  if (slot.includes('12:00–15:00')) return 'MIDDAY_12_15';
  if (slot.includes('15:00–18:00')) return 'AFTERNOON_15_18';
  if (slot.includes('18:00–20:00')) return 'EVENING_18_20';
  if (slot.includes('08:00–12:00')) return 'MORNING_9_12';
  return 'MORNING_9_12';
}

function mapLegacyStatusToOrderStatus(
  status: Order['status']
): SupabaseOrderStatus {
  if (status === 'paid') return 'PAID';
  if (status === 'payment_failed') return 'NEW'; // Keep as NEW; payment_status tracks failure
  return 'NEW'; // pending_payment or undefined (bank transfer) -> NEW
}

function mapLegacyStatusToPaymentStatus(
  status: Order['status']
): SupabasePaymentStatus {
  if (status === 'paid') return 'PAID';
  if (status === 'payment_failed') return 'FAILED';
  return 'PENDING'; // pending_payment or undefined
}

function extractDeliveryDate(preferredTimeSlot: string): string | null {
  const datePart = preferredTimeSlot.split(' ')[0];
  if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  return null;
}

/**
 * Dual-write order to Supabase. Best-effort; never throws to caller.
 * Gated by SUPABASE_DUAL_WRITE_ENABLED.
 */
export async function dualWriteOrder(order: Order): Promise<void> {
  if (process.env.SUPABASE_DUAL_WRITE_ENABLED !== 'true') return;

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
        console.log('[supabase] Skipped: env vars not configured');
      }
      return;
    }

    const deliveryWindow = mapPreferredTimeSlotToWindow(
      order.delivery.preferredTimeSlot ?? ''
    );
    const orderStatus = mapLegacyStatusToOrderStatus(order.status);
    const paymentStatus = mapLegacyStatusToPaymentStatus(order.status);
    const deliveryDate = extractDeliveryDate(
      order.delivery.preferredTimeSlot ?? ''
    );

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('public_token')
      .eq('order_id', order.orderId)
      .single();

    const publicToken = existingOrder?.public_token ?? nanoid(21);

    const ordersRow = {
      order_id: order.orderId,
      public_token: publicToken,
      customer_name: order.customerName ?? null,
      customer_email: order.customerEmail ?? null,
      phone: order.phone ?? null,
      address: order.delivery.address ?? null,
      district: order.delivery.deliveryDistrict ?? 'UNKNOWN',
      delivery_window: deliveryWindow,
      delivery_date: deliveryDate,
      order_status: orderStatus,
      payment_status: paymentStatus,
      stripe_session_id: order.stripeSessionId ?? null,
      stripe_payment_intent_id: order.paymentIntentId ?? null,
      paid_at: order.paidAt ?? null,
      items_total: order.pricing?.itemsTotal ?? 0,
      delivery_fee: order.pricing?.deliveryFee ?? 0,
      grand_total: order.pricing?.grandTotal ?? 0,
      created_at: order.createdAt,
      recipient_name: order.delivery.recipientName ?? null,
      recipient_phone: order.delivery.recipientPhone ?? null,
      contact_preference: order.contactPreference
        ? JSON.stringify(order.contactPreference)
        : null,
      referral_code: order.referralCode ?? null,
      referral_discount: order.referralDiscount ?? 0,
    };

    const { error: upsertError } = await supabase
      .from('orders')
      .upsert(ordersRow, {
        onConflict: 'order_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('[supabase] order upsert error', order.orderId, upsertError.message);
      return;
    }

    // Delete existing order_items and re-insert (snapshot)
    await supabase.from('order_items').delete().eq('order_id', order.orderId);

    if (order.items?.length) {
      const itemsRows = order.items.map((item) => ({
        order_id: order.orderId,
        bouquet_id: item.bouquetId,
        bouquet_title: item.bouquetTitle,
        size: item.size,
        price: item.price,
        image_url_snapshot: item.imageUrl ?? null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsRows);

      if (itemsError) {
        console.error('[supabase] order_items insert error', order.orderId, itemsError.message);
      }
    }

    // Insert status history entry
    const { error: historyError } = await supabase.from('order_status_history').insert({
      order_id: order.orderId,
      from_status: null,
      to_status: orderStatus,
      created_at: new Date().toISOString(),
    });

    if (historyError) {
      if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
        console.log('[supabase] order_status_history insert warning', order.orderId, historyError.message);
      }
    }

    console.log('[supabase] order upsert ok', order.orderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[supabase] order upsert error', order.orderId, msg);
  }
}

/**
 * Sync payment success to Supabase. Called from Stripe webhook.
 * Best-effort; never throws.
 */
export async function syncSupabasePaymentSuccess(
  orderId: string,
  paymentIntentId: string | undefined,
  paidAt: string
): Promise<void> {
  if (process.env.SUPABASE_DUAL_WRITE_ENABLED !== 'true') return;

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    // Update by order_id (we have it from webhook metadata)
    const { data: existing, error: fetchError } = await supabase
      .from('orders')
      .select('order_id, order_status, payment_status')
      .eq('order_id', orderId)
      .single();

    if (fetchError || !existing) {
      console.log('[supabase] order not found for payment sync:', orderId);
      return;
    }

    if (existing.payment_status === 'PAID') {
      return; // Idempotent: already paid
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'PAID',
        order_status: 'PAID',
        paid_at: paidAt,
        stripe_payment_intent_id: paymentIntentId ?? undefined,
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('[supabase] payment sync update error', orderId, updateError.message);
      return;
    }

    // Add status history
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      from_status: existing.order_status ?? 'NEW',
      to_status: 'PAID',
      created_at: new Date().toISOString(),
    });

    if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
      console.log('[supabase] payment sync ok', orderId);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[supabase] payment sync error', orderId, msg);
  }
}

/**
 * Sync payment failed to Supabase. Called from Stripe webhook.
 */
export async function syncSupabasePaymentFailed(orderId: string): Promise<void> {
  if (process.env.SUPABASE_DUAL_WRITE_ENABLED !== 'true') return;

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    const { data: existing } = await supabase
      .from('orders')
      .select('order_id, payment_status')
      .eq('order_id', orderId)
      .single();

    if (!existing) {
      console.log('[supabase] order not found for payment failed sync:', orderId);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'FAILED' })
      .eq('order_id', orderId);

    if (error) {
      console.error('[supabase] payment failed sync error', orderId, error.message);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[supabase] payment failed sync error', orderId, msg);
  }
}
