/**
 * Supabase store backend. Primary store when ORDERS_PRIMARY_STORE=supabase.
 */

import 'server-only';
import { nanoid } from 'nanoid';
import { createSupabaseAnonWithOrderToken, getSupabaseAdmin } from '@/lib/supabase/server';
import type { Order, OrderPayload } from './types';

function normalizeSubmissionToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[0-9a-fA-F-]+$/.test(t)) return null;
  return t;
}

function normalizePublicOrderToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

function stripSubmissionTokenForStorage(payload: OrderPayload): OrderPayload {
  const { submissionToken: _drop, ...rest } = payload as OrderPayload & { submissionToken?: string };
  return rest;
}
import { normalizeOrderStatus, orderStatusToFulfillmentDisplay } from './statusConstants';

/**
 * Customer fulfillment key from DB columns. If `order_status` is empty, use `fulfillment_status`
 * (legacy rows). Treat DELIVERED / delivered display as authoritative.
 */
function fulfillmentDisplayFromSupabaseRow(
  row: Pick<SupabaseOrderRow, 'order_status' | 'fulfillment_status'>,
  jsonFallback?: Order['fulfillmentStatus'],
): Order['fulfillmentStatus'] {
  if (normalizeOrderStatus(row.order_status) === 'DELIVERED') return 'delivered';
  const fsDisp = row.fulfillment_status
    ? orderStatusToFulfillmentDisplay(row.fulfillment_status)
    : null;
  if (fsDisp === 'delivered') return 'delivered';
  const hasOrderStatus = row.order_status != null && String(row.order_status).trim() !== '';
  const osDisp = hasOrderStatus ? orderStatusToFulfillmentDisplay(row.order_status) : null;
  return (osDisp ?? fsDisp ?? jsonFallback ?? 'new') as Order['fulfillmentStatus'];
}

function mapSupabasePaymentToLegacy(paymentStatus: string | null | undefined): Order['status'] {
  const s = (paymentStatus ?? '').toUpperCase();
  if (s === 'PAID') return 'paid';
  if (s === 'FAILED' || s === 'ERROR' || s === 'CANCELLED') return 'payment_failed';
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
  /** True after admin was notified once at order creation (one email per order). */
  admin_notified?: boolean | null;
  admin_notified_at?: string | null;
  line_user_id?: string | null;
  order_source?: string | null;
  last_line_push_status?: string | null;
  last_line_push_at?: string | null;
  submission_token?: string | null;
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
      fulfillmentStatus: fulfillmentDisplayFromSupabaseRow(row, json.fulfillmentStatus),
      fulfillmentStatusUpdatedAt: row.fulfillment_status_updated_at ?? row.updated_at ?? json.fulfillmentStatusUpdatedAt,
      ...(row.order_source && {
        orderSource: row.order_source as 'web' | 'custom_form' | 'legacy_line',
      }),
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

  const looseJson = row.order_json as Partial<Order> | null | undefined;
  const surpriseFromJson = looseJson?.delivery?.surpriseDelivery;

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
      ...(surpriseFromJson !== undefined && { surpriseDelivery: surpriseFromJson }),
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
    fulfillmentStatus: fulfillmentDisplayFromSupabaseRow(row),
    fulfillmentStatusUpdatedAt: row.fulfillment_status_updated_at ?? row.updated_at ?? undefined,
    ...(row.order_source && {
      orderSource: row.order_source as 'web' | 'custom_form' | 'legacy_line',
    }),
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

export async function supabaseGetOrderByIdWithPublicToken(
  orderId: string,
  publicToken: string
): Promise<Order | null> {
  const normalizedOrderId = orderId.trim();
  const normalizedToken = normalizePublicOrderToken(publicToken);
  if (!normalizedOrderId || !normalizedToken) return null;

  const supabase = createSupabaseAnonWithOrderToken(normalizedToken);
  if (!supabase) return null;

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', normalizedOrderId)
    .single();

  if (orderError || !orderRow) {
    return null;
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('bouquet_id, bouquet_title, size, price, image_url_snapshot')
    .eq('order_id', normalizedOrderId)
    .order('bouquet_id');

  return rowToOrder(orderRow as SupabaseOrderRow, (items ?? []) as SupabaseOrderItemRow[]);
}

export async function supabaseGetOrderPublicToken(orderId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = orderId.trim();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('orders')
    .select('public_token')
    .eq('order_id', normalized)
    .maybeSingle();
  if (error || !data?.public_token) return null;
  return String(data.public_token);
}

export async function supabaseGetOrderBySubmissionToken(token: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = token.trim();
  if (!normalized) return null;

  const { data: row, error } = await supabase
    .from('orders')
    .select('order_id')
    .eq('submission_token', normalized)
    .maybeSingle();

  if (error || !row?.order_id) {
    if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
      console.log('[orders/supabase] getOrderBySubmissionToken:', error?.message);
    }
    return null;
  }

  return supabaseGetOrderById(String(row.order_id));
}

export async function supabaseCreateOrder(
  payload: OrderPayload,
  status?: Order['status']
): Promise<{ order: Order; created: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const submissionToken = normalizeSubmissionToken(payload.submissionToken);
  if (submissionToken) {
    const existing = await supabaseGetOrderBySubmissionToken(submissionToken);
    if (existing) {
      return { order: existing, created: false };
    }
  }

  const payloadForOrder = stripSubmissionTokenForStorage(payload);

  const orderId = (await import('./orderId')).generateOrderId();
  const order: Order = {
    ...payloadForOrder,
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

  const orderStatus = status === 'paid' ? 'PROCESSING' : 'NEW';
  const paymentStatus = status === 'paid' ? 'PAID' : status === 'payment_failed' ? 'ERROR' : 'NOT_PAID';

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
    ...((order as { ga_client_id?: string }).ga_client_id && {
      ga_client_id: (order as { ga_client_id: string }).ga_client_id,
    }),
    ...(submissionToken ? { submission_token: submissionToken } : {}),
  };

  const { error: upsertError } = await supabase
    .from('orders')
    .upsert(ordersRow, { onConflict: 'order_id', ignoreDuplicates: false });

  if (upsertError) {
    const isUniqueViolation =
      upsertError.code === '23505' ||
      /duplicate key|unique constraint/i.test(String(upsertError.message ?? ''));
    if (submissionToken && isUniqueViolation) {
      const recovered = await supabaseGetOrderBySubmissionToken(submissionToken);
      if (recovered) {
        return { order: recovered, created: false };
      }
    }
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
      item_type: item.itemType ?? 'bouquet',
      cost: item.cost ?? null,
      commission_amount: item.commissionAmount ?? null,
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
  return { order, created: true };
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

  const { data: rowBefore, error: fetchError } = await supabase
    .from('orders')
    .select('payment_status, order_json')
    .eq('order_id', normalized)
    .single();

  if (fetchError || !rowBefore) {
    console.error('[orders/supabase] updatePaymentStatus fetch error:', fetchError?.message);
    return null;
  }

  const prevPaymentUpper = (rowBefore.payment_status ?? 'NOT_PAID').toUpperCase();

  const paymentStatus = update.status === 'paid' ? 'PAID' : 'ERROR';
  const orderStatus = update.status === 'paid' ? 'PROCESSING' : 'NEW';

  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    order_status: orderStatus,
    payment_method: 'STRIPE',
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

  // Same convention as admin PATCH payment-status: record payment_status transition in history.
  if (update.status === 'paid' && prevPaymentUpper !== 'PAID') {
    const { error: histError } = await supabase.from('order_status_history').insert({
      order_id: normalized,
      from_status: rowBefore.payment_status ?? 'NOT_PAID',
      to_status: 'PAID',
      created_at: new Date().toISOString(),
    });
    if (histError) {
      console.error('[orders/supabase] updatePaymentStatus history insert error:', histError.message);
    }
  } else if (update.status === 'payment_failed' && prevPaymentUpper !== 'ERROR') {
    const { error: histError } = await supabase.from('order_status_history').insert({
      order_id: normalized,
      from_status: rowBefore.payment_status ?? 'NOT_PAID',
      to_status: 'ERROR',
      created_at: new Date().toISOString(),
    });
    if (histError) {
      console.error('[orders/supabase] updatePaymentStatus history insert error:', histError.message);
    }
  }

  // Update order_json if it exists (keep payment fields in sync)
  if (rowBefore.order_json && typeof rowBefore.order_json === 'object') {
    const json = rowBefore.order_json as Record<string, unknown>;
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
  const orderStatus = order.status === 'paid' ? 'PROCESSING' : 'NEW';
  const paymentStatus = order.status === 'paid' ? 'PAID' : order.status === 'payment_failed' ? 'ERROR' : 'NOT_PAID';

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
      item_type: item.itemType ?? 'bouquet',
      cost: item.cost ?? null,
      commission_amount: item.commissionAmount ?? null,
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

export async function supabaseDeleteOrder(orderId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const normalized = orderId.trim();
  await supabase.from('order_items').delete().eq('order_id', normalized);
  await supabase.from('order_status_history').delete().eq('order_id', normalized);
  const { error } = await supabase.from('orders').delete().eq('order_id', normalized);

  if (error) {
    console.error('[orders/supabase] deleteOrder error:', error.message);
    return false;
  }
  return true;
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

export interface OrderLookupSummary {
  orderId: string;
  fulfillmentStatus: string;
  deliveryDate: string | null;
  createdAt: string;
  orderToken?: string | null;
}

export async function supabaseLookupOrdersByPhone(
  phoneDigits: string,
  name?: string
): Promise<OrderLookupSummary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const digits = phoneDigits.replace(/\D/g, '');
  if (digits.length < 8) return [];

  // Thai numbers: 0812345678 -> use 812345678 to match 66812345678
  const searchDigits = digits.length === 10 && digits.startsWith('0') ? digits.slice(1) : digits;
  const pattern = `%${searchDigits}%`;

  let query = supabase
    .from('orders')
    .select('order_id, order_status, delivery_date, created_at, public_token')
    .or(`phone.ilike.${pattern},recipient_phone.ilike.${pattern}`);

  if (name?.trim()) {
    query = query.ilike('customer_name', `%${name.trim()}%`);
  }

  const { data: rows, error } = await query
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
      console.log('[orders/supabase] lookupByPhone error:', error.message);
    }
    return [];
  }

  return (rows ?? []).map((r: {
    order_id: string;
    order_status: string | null;
    delivery_date: string | null;
    created_at: string | null;
    public_token: string | null;
  }) => ({
    orderId: r.order_id,
    fulfillmentStatus: orderStatusToFulfillmentDisplay(r.order_status),
    deliveryDate: r.delivery_date ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
    orderToken: r.public_token ?? null,
  }));
}

/** Look up orders by order ID (partial match, e.g. "LB-2025" or full "LB-2025-XXXX"). */
export async function supabaseLookupOrdersByOrderId(
  orderIdQuery: string
): Promise<OrderLookupSummary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const trimmed = orderIdQuery.trim();
  if (!trimmed) return [];

  const pattern = `%${trimmed}%`;

  const { data: rows, error } = await supabase
    .from('orders')
    .select('order_id, order_status, delivery_date, created_at, public_token')
    .ilike('order_id', pattern)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    if (process.env.SUPABASE_LOG_LEVEL === 'debug') {
      console.log('[orders/supabase] lookupByOrderId error:', error.message);
    }
    return [];
  }

  return (rows ?? []).map((r: {
    order_id: string;
    order_status: string | null;
    delivery_date: string | null;
    created_at: string | null;
    public_token: string | null;
  }) => ({
    orderId: r.order_id,
    fulfillmentStatus: orderStatusToFulfillmentDisplay(r.order_status),
    deliveryDate: r.delivery_date ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
    orderToken: r.public_token ?? null,
  }));
}

