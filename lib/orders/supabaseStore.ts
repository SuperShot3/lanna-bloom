/**
 * Supabase store backend. Primary store when ORDERS_PRIMARY_STORE=supabase.
 */

import 'server-only';
import { nanoid } from 'nanoid';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { Order, OrderPayload } from './types';

function mapSupabasePaymentToLegacy(paymentStatus: string | null | undefined): Order['status'] {
  if (paymentStatus === 'PAID') return 'paid';
  if (paymentStatus === 'FAILED') return 'payment_failed';
  return 'pending_payment';
}

function mapDeliveryWindowToTimeSlot(window: string | null | undefined, date: string | null | undefined): string {
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const timeMap: Record<string, string> = {
    MORNING_9_12: '08:00–12:00',
    MIDDAY_12_15: '12:00–15:00',
    AFTERNOON_15_18: '15:00–18:00',
    EVENING_18_20: '18:00–20:00',
  };
  const time = window ? timeMap[window] ?? '09:00–12:00' : '09:00–12:00';
  return `${d} ${time}`;
}

interface SupabaseOrderRow {
  order_id: string;
  order_json?: Record<string, unknown> | null;
  public_token?: string | null;
  payment_method?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  delivery_window?: string | null;
  delivery_date?: string | null;
  order_status?: string | null;
  payment_status?: string | null;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  paid_at?: string | null;
  items_total?: number | null;
  delivery_fee?: number | null;
  grand_total?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  contact_preference?: string | null;
  referral_code?: string | null;
  referral_discount?: number | null;
  fulfillment_status?: string | null;
  fulfillment_status_updated_at?: string | null;
}

interface SupabaseOrderItemRow {
  bouquet_id: string | null;
  bouquet_title: string | null;
  size: string | null;
  price: number | null;
  image_url_snapshot: string | null;
}

function rowToOrder(row: SupabaseOrderRow, items: SupabaseOrderItemRow[]): Order {
  // If order_json exists and has the expected shape, use it (migration/backfill)
  const json = row.order_json as Order | undefined;
  if (json && typeof json.orderId === 'string' && Array.isArray(json.items)) {
    return {
      ...json,
      orderId: row.order_id,
      createdAt: row.created_at ?? json.createdAt ?? new Date().toISOString(),
      status: mapSupabasePaymentToLegacy(row.payment_status) ?? json.status,
      stripeSessionId: row.stripe_session_id ?? json.stripeSessionId,
      paymentIntentId: row.stripe_payment_intent_id ?? json.paymentIntentId,
      paidAt: row.paid_at ?? json.paidAt,
      fulfillmentStatus: (row.fulfillment_status as Order['fulfillmentStatus']) ?? json.fulfillmentStatus ?? 'new',
      fulfillmentStatusUpdatedAt: row.fulfillment_status_updated_at ?? json.fulfillmentStatusUpdatedAt,
    };
  }

  // Reconstruct from normalized columns
  const contactPref = row.contact_preference;
  let contactPreference: Order['contactPreference'];
  try {
    contactPreference = contactPref ? (JSON.parse(contactPref) as Order['contactPreference']) : undefined;
  } catch {
    contactPreference = undefined;
  }

  const orderItems = items.map((i) => ({
    bouquetId: i.bouquet_id ?? '',
    bouquetTitle: i.bouquet_title ?? '',
    size: i.size ?? '',
    price: i.price ?? 0,
    addOns: { cardType: null, cardMessage: '', wrappingOption: null },
    imageUrl: i.image_url_snapshot ?? undefined,
  }));

  const preferredTimeSlot = mapDeliveryWindowToTimeSlot(row.delivery_window, row.delivery_date);

  return {
    orderId: row.order_id,
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    phone: row.phone ?? undefined,
    items: orderItems,
    delivery: {
      address: row.address ?? '',
      preferredTimeSlot,
      recipientName: row.recipient_name ?? undefined,
      recipientPhone: row.recipient_phone ?? undefined,
      deliveryDistrict: (row.district as Order['delivery']['deliveryDistrict']) ?? 'UNKNOWN',
    },
    pricing: {
      itemsTotal: row.items_total ?? 0,
      deliveryFee: row.delivery_fee ?? 0,
      grandTotal: row.grand_total ?? 0,
    },
    contactPreference,
    referralCode: row.referral_code ?? undefined,
    referralDiscount: row.referral_discount ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    status: mapSupabasePaymentToLegacy(row.payment_status),
    stripeSessionId: row.stripe_session_id ?? undefined,
    paymentIntentId: row.stripe_payment_intent_id ?? undefined,
    paidAt: row.paid_at ?? undefined,
    fulfillmentStatus: (row.fulfillment_status as Order['fulfillmentStatus']) ?? 'new',
    fulfillmentStatusUpdatedAt: row.fulfillment_status_updated_at ?? undefined,
  };
}

export async function supabaseGetOrderById(orderId: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = orderId.trim();
  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', normalized)
    .single();

  if (orderError || !orderRow) {
    if (orderError?.code === 'PGRST116') return null;
    if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
      console.log('[orders/supabase] getOrderById error:', orderError?.message);
    }
    return null;
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('bouquet_id, bouquet_title, size, price, image_url_snapshot')
    .eq('order_id', normalized)
    .order('bouquet_id');

  return rowToOrder(orderRow as SupabaseOrderRow, (items ?? []) as SupabaseOrderItemRow[]);
}

export async function supabaseCreateOrder(payload: OrderPayload, status?: Order['status']): Promise<Order> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const orderId = (await import('./blobStore')).generateOrderId();
  const order: Order = {
    ...payload,
    orderId,
    createdAt: new Date().toISOString(),
    fulfillmentStatus: 'new',
    ...(status ? { status } : {}),
  };

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('public_token')
    .eq('order_id', orderId)
    .single();

  const publicToken = existingOrder?.public_token ?? nanoid(21);
  const paymentMethod = order.stripeSessionId || order.paymentIntentId ? 'STRIPE' : 'BANK_TRANSFER';

  const deliveryDate = order.delivery.preferredTimeSlot?.split(' ')[0];
  const deliveryWindow = (() => {
    const s = order.delivery.preferredTimeSlot ?? '';
    if (s.includes('12:00') && s.includes('15:00')) return 'MIDDAY_12_15';
    if (s.includes('15:00') && s.includes('18:00')) return 'AFTERNOON_15_18';
    if (s.includes('18:00') && s.includes('20:00')) return 'EVENING_18_20';
    return 'MORNING_9_12';
  })();

  const orderStatus = status === 'paid' ? 'PAID' : status === 'payment_failed' ? 'NEW' : 'NEW';
  const paymentStatus = status === 'paid' ? 'PAID' : status === 'payment_failed' ? 'FAILED' : 'PENDING';

  const ordersRow = {
    order_id: order.orderId,
    public_token: publicToken,
    payment_method: paymentMethod,
    customer_name: order.customerName ?? null,
    customer_email: order.customerEmail ?? null,
    phone: order.phone ?? null,
    address: order.delivery.address ?? null,
    district: order.delivery.deliveryDistrict ?? 'UNKNOWN',
    delivery_window: deliveryWindow,
    delivery_date: deliveryDate ?? null,
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
    contact_preference: order.contactPreference ? JSON.stringify(order.contactPreference) : null,
    referral_code: order.referralCode ?? null,
    referral_discount: order.referralDiscount ?? 0,
    fulfillment_status: 'new',
    fulfillment_status_updated_at: new Date().toISOString(),
    order_json: order as unknown as Record<string, unknown>,
  };

  const { error: upsertError } = await supabase
    .from('orders')
    .upsert(ordersRow, { onConflict: 'order_id', ignoreDuplicates: false });

  if (upsertError) {
    console.error('[orders/supabase] createOrder upsert error:', upsertError.message);
    throw upsertError;
  }

  // Insert order_items
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
    const { error: itemsError } = await supabase.from('order_items').insert(itemsRows);
    if (itemsError) {
      console.error('[orders/supabase] order_items insert error:', itemsError.message);
    }
  }

  // Status history
  await supabase.from('order_status_history').insert({
    order_id: order.orderId,
    from_status: null,
    to_status: orderStatus,
    created_at: new Date().toISOString(),
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[orders/supabase] Created', orderId);
  }
  return order;
}

export async function supabaseUpdateOrderPaymentStatus(
  orderId: string,
  update: {
    status: 'paid' | 'payment_failed';
    stripeSessionId?: string;
    paymentIntentId?: string;
    amountTotal?: number;
    currency?: string;
    paidAt?: string;
  }
): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = orderId.trim();
  const paymentStatus = update.status === 'paid' ? 'PAID' : 'FAILED';
  const orderStatus = update.status === 'paid' ? 'PAID' : 'NEW';

  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    order_status: orderStatus,
    updated_at: new Date().toISOString(),
    paid_at: update.paidAt ?? undefined,
    stripe_session_id: update.stripeSessionId,
    stripe_payment_intent_id: update.paymentIntentId,
  };

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('order_id', normalized);

  if (error) {
    console.error('[orders/supabase] updatePaymentStatus error:', error.message);
    return null;
  }

  // Update order_json if it exists (keep payment fields in sync)
  const { data: existing } = await supabase
    .from('orders')
    .select('order_json')
    .eq('order_id', normalized)
    .single();

  if (existing?.order_json && typeof existing.order_json === 'object') {
    const json = existing.order_json as Record<string, unknown>;
    await supabase
      .from('orders')
      .update({
        order_json: {
          ...json,
          status: update.status,
          stripeSessionId: update.stripeSessionId ?? json.stripeSessionId,
          paymentIntentId: update.paymentIntentId ?? json.paymentIntentId,
          paidAt: update.paidAt ?? json.paidAt,
        },
      })
      .eq('order_id', normalized);
  }

  return supabaseGetOrderById(normalized);
}

export async function supabaseUpsertOrder(order: Order): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('public_token')
    .eq('order_id', order.orderId)
    .single();

  const publicToken = existingOrder?.public_token ?? nanoid(21);
  const paymentMethod = order.stripeSessionId || order.paymentIntentId ? 'STRIPE' : 'BANK_TRANSFER';
  const deliveryDate = order.delivery.preferredTimeSlot?.split(' ')[0];
  const deliveryWindow = (() => {
    const s = order.delivery.preferredTimeSlot ?? '';
    if (s.includes('12:00') && s.includes('15:00')) return 'MIDDAY_12_15';
    if (s.includes('15:00') && s.includes('18:00')) return 'AFTERNOON_15_18';
    if (s.includes('18:00') && s.includes('20:00')) return 'EVENING_18_20';
    return 'MORNING_9_12';
  })();
  const orderStatus = order.status === 'paid' ? 'PAID' : order.status === 'payment_failed' ? 'NEW' : 'NEW';
  const paymentStatus = order.status === 'paid' ? 'PAID' : order.status === 'payment_failed' ? 'FAILED' : 'PENDING';

  const ordersRow = {
    order_id: order.orderId,
    public_token: publicToken,
    payment_method: paymentMethod,
    customer_name: order.customerName ?? null,
    customer_email: order.customerEmail ?? null,
    phone: order.phone ?? null,
    address: order.delivery.address ?? null,
    district: order.delivery.deliveryDistrict ?? 'UNKNOWN',
    delivery_window: deliveryWindow,
    delivery_date: deliveryDate ?? null,
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
    contact_preference: order.contactPreference ? JSON.stringify(order.contactPreference) : null,
    referral_code: order.referralCode ?? null,
    referral_discount: order.referralDiscount ?? 0,
    fulfillment_status: order.fulfillmentStatus ?? 'new',
    fulfillment_status_updated_at: order.fulfillmentStatusUpdatedAt ?? new Date().toISOString(),
    order_json: order as unknown as Record<string, unknown>,
  };

  await supabase
    .from('orders')
    .upsert(ordersRow, { onConflict: 'order_id', ignoreDuplicates: false });

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
    await supabase.from('order_items').insert(itemsRows);
  }
}

export async function supabaseGetOrderByStripeSessionId(stripeSessionId: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from('orders')
    .select('order_id')
    .eq('stripe_session_id', stripeSessionId)
    .single();

  if (!row?.order_id) return null;
  return supabaseGetOrderById(row.order_id);
}

export async function supabaseListOrders(): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: rows } = await supabase
    .from('orders')
    .select('order_id')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (!rows?.length) return [];
  const orders: Order[] = [];
  for (const r of rows) {
    const o = await supabaseGetOrderById(r.order_id);
    if (o) orders.push(o);
  }
  return orders;
}
