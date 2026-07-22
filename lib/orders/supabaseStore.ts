/**
 * Supabase store backend. Primary store when ORDERS_PRIMARY_STORE=supabase.
 */

import 'server-only';
import { nanoid } from 'nanoid';
import { parseDeliveryDestinationId } from '@/lib/delivery/markets';
import { createSupabaseAnonWithOrderToken, getSupabaseAdmin } from '@/lib/supabase/server';
import type { Order, OrderPayload } from './types';
import {
  buildDeliveryUpdatePayload,
  deliveryWindowFromTimeSlot,
  isDeliveryWindow,
  preferredTimeSlotFromParts,
  type DeliveryDetailsPatch,
  type DeliveryDetailsSnapshot,
  type DeliveryWindow,
} from './deliveryFields';
import { normalizeOrderStatus, orderStatusToFulfillmentDisplay } from './statusConstants';

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
  return preferredTimeSlotFromParts(date, window);
}

interface SupabaseOrderRow {
  order_id: string;
  order_json?: Record<string, unknown> | null;
  public_token?: string | null;
  payment_method?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
  address?: string | null;
  delivery_destination?: string | null;
  delivery_zone?: string | null;
  postal_code?: string | null;
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
  recipient_phone_country_code?: string | null;
  contact_preference?: string | null;
  referral_code?: string | null;
  referral_discount?: number | null;
  fulfillment_status?: string | null;
  fulfillment_status_updated_at?: string | null;
  delivery_google_maps_url?: string | null;
  /** True after admin was notified once at order creation (one email per order). */
  admin_notified?: boolean | null;
  admin_notified_at?: string | null;
  line_user_id?: string | null;
  order_source?: string | null;
  last_line_push_status?: string | null;
  last_line_push_at?: string | null;
  submission_token?: string | null;
  marketing_email_consent?: boolean | null;
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
    const phoneCc = row.phone_country_code?.trim() || json.phoneCountryCode;
    const recipientCc =
      row.recipient_phone_country_code?.trim() || json.delivery?.recipientPhoneCountryCode;
    return {
      ...json,
      orderId: row.order_id,
      marketingEmailConsent:
        row.marketing_email_consent === true || json.marketingEmailConsent === true,
      phone: row.phone ?? json.phone,
      phoneCountryCode: phoneCc || json.phoneCountryCode,
      createdAt: row.created_at ?? json.createdAt ?? new Date().toISOString(),
      status: mapSupabasePaymentToLegacy(row.payment_status) ?? json.status,
      stripeSessionId: row.stripe_session_id ?? json.stripeSessionId,
      paymentIntentId: row.stripe_payment_intent_id ?? json.paymentIntentId,
      paidAt: row.paid_at ?? json.paidAt,
      fulfillmentStatus: fulfillmentDisplayFromSupabaseRow(row, json.fulfillmentStatus),
      fulfillmentStatusUpdatedAt: row.fulfillment_status_updated_at ?? row.updated_at ?? json.fulfillmentStatusUpdatedAt,
      delivery: {
        ...json.delivery,
        address: row.address ?? json.delivery?.address ?? '',
        preferredTimeSlot:
          mapDeliveryWindowToTimeSlot(row.delivery_window, row.delivery_date) ||
          json.delivery?.preferredTimeSlot ||
          '',
        deliveryDestination:
          parseDeliveryDestinationId(row.delivery_destination) ??
          parseDeliveryDestinationId(json.delivery?.deliveryDestination) ??
          'CHIANG_MAI',
        deliveryZoneId: row.delivery_zone?.trim() || json.delivery?.deliveryZoneId,
        recipientName: row.recipient_name ?? json.delivery?.recipientName,
        recipientPhone: row.recipient_phone ?? json.delivery?.recipientPhone,
        recipientPhoneCountryCode: recipientCc || json.delivery?.recipientPhoneCountryCode,
        ...(row.delivery_google_maps_url?.trim()
          ? { deliveryGoogleMapsUrl: row.delivery_google_maps_url.trim() }
          : {}),
      },
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
    addOns: { cardType: null, cardMessage: '', wrappingOption: null, paperColor: null },
    imageUrl: i.image_url_snapshot ?? undefined,
  }));

  const preferredTimeSlot = mapDeliveryWindowToTimeSlot(row.delivery_window, row.delivery_date);

  const looseJson = row.order_json as Partial<Order> | null | undefined;
  const surpriseFromJson = looseJson?.delivery?.surpriseDelivery;

  return {
    orderId: row.order_id,
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    marketingEmailConsent: row.marketing_email_consent === true,
    phone: row.phone ?? undefined,
    phoneCountryCode: row.phone_country_code?.trim() || looseJson?.phoneCountryCode,
    items: orderItems,
    delivery: {
      address: row.address ?? '',
      preferredTimeSlot,
      deliveryDestination:
        parseDeliveryDestinationId(row.delivery_destination) ??
        parseDeliveryDestinationId(looseJson?.delivery?.deliveryDestination) ??
        'CHIANG_MAI',
      deliveryZoneId: row.delivery_zone?.trim() || looseJson?.delivery?.deliveryZoneId,
      recipientName: row.recipient_name ?? undefined,
      recipientPhone: row.recipient_phone ?? undefined,
      recipientPhoneCountryCode:
        row.recipient_phone_country_code?.trim() || looseJson?.delivery?.recipientPhoneCountryCode,
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
    ...(typeof looseJson?.lineId === 'string' && looseJson.lineId.trim()
      ? { lineId: looseJson.lineId.trim() }
      : {}),
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
  const deliveryWindow = deliveryWindowFromTimeSlot(order.delivery.preferredTimeSlot ?? '');

  const orderStatus = 'NEW';
  const paymentStatus = status === 'paid' ? 'PAID' : status === 'payment_failed' ? 'ERROR' : 'NOT_PAID';

  const ordersRow = {
    order_id: order.orderId,
    public_token: publicToken,
    payment_method: paymentMethod,
    customer_name: order.customerName ?? null,
    customer_email: order.customerEmail ?? null,
    phone: order.phone ?? null,
    phone_country_code: order.phoneCountryCode ?? null,
    address: order.delivery.address ?? null,
    delivery_destination: order.delivery.deliveryDestination ?? null,
    delivery_zone: order.delivery.deliveryZoneId ?? null,
    postal_code: order.delivery.postalCode ?? null,
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
    recipient_phone_country_code: order.delivery.recipientPhoneCountryCode ?? null,
    contact_preference: order.contactPreference ? JSON.stringify(order.contactPreference) : null,
    referral_code: order.referralCode ?? null,
    referral_discount: order.referralDiscount ?? 0,
    fulfillment_status: 'new',
    fulfillment_status_updated_at: new Date().toISOString(),
    order_json: order as unknown as Record<string, unknown>,
    ...((order as { ga_client_id?: string }).ga_client_id && {
      ga_client_id: (order as { ga_client_id: string }).ga_client_id,
    }),
    ...((order as { ga_session_id?: string }).ga_session_id && {
      ga_session_id: (order as { ga_session_id: string }).ga_session_id,
    }),
    ...((order as { gclid?: string }).gclid && {
      gclid: (order as { gclid: string }).gclid,
    }),
    ...((order as { gbraid?: string }).gbraid && {
      gbraid: (order as { gbraid: string }).gbraid,
    }),
    ...((order as { wbraid?: string }).wbraid && {
      wbraid: (order as { wbraid: string }).wbraid,
    }),
    ...(submissionToken ? { submission_token: submissionToken } : {}),
    marketing_email_consent: order.marketingEmailConsent === true,
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
    paymentFeeMajor?: number;
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
  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    payment_method: 'STRIPE',
    updated_at: new Date().toISOString(),
    paid_at: update.paidAt ?? undefined,
    stripe_session_id: update.stripeSessionId,
    stripe_payment_intent_id: update.paymentIntentId,
  };

  if (update.status === 'paid' && update.paymentFeeMajor != null && Number.isFinite(update.paymentFeeMajor)) {
    updatePayload.payment_fee = Math.round(update.paymentFeeMajor * 100) / 100;
  }

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
  const deliveryWindow = deliveryWindowFromTimeSlot(order.delivery.preferredTimeSlot ?? '');
  const orderStatus = 'NEW';
  const paymentStatus = order.status === 'paid' ? 'PAID' : order.status === 'payment_failed' ? 'ERROR' : 'NOT_PAID';

  const ordersRow = {
    order_id: order.orderId,
    public_token: publicToken,
    payment_method: paymentMethod,
    customer_name: order.customerName ?? null,
    customer_email: order.customerEmail ?? null,
    phone: order.phone ?? null,
    phone_country_code: order.phoneCountryCode ?? null,
    address: order.delivery.address ?? null,
    delivery_destination: order.delivery.deliveryDestination ?? null,
    delivery_zone: order.delivery.deliveryZoneId ?? null,
    postal_code: order.delivery.postalCode ?? null,
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
    recipient_phone_country_code: order.delivery.recipientPhoneCountryCode ?? null,
    contact_preference: order.contactPreference ? JSON.stringify(order.contactPreference) : null,
    referral_code: order.referralCode ?? null,
    referral_discount: order.referralDiscount ?? 0,
    fulfillment_status: order.fulfillmentStatus ?? 'new',
    fulfillment_status_updated_at: order.fulfillmentStatusUpdatedAt ?? new Date().toISOString(),
    order_json: order as unknown as Record<string, unknown>,
    marketing_email_consent: order.marketingEmailConsent === true,
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
    .select('order_id, order_status, delivery_date, created_at')
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
  }) => ({
    orderId: r.order_id,
    fulfillmentStatus: orderStatusToFulfillmentDisplay(r.order_status),
    deliveryDate: r.delivery_date ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
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
    .select('order_id, order_status, delivery_date, created_at')
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
  }) => ({
    orderId: r.order_id,
    fulfillmentStatus: orderStatusToFulfillmentDisplay(r.order_status),
    deliveryDate: r.delivery_date ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
  }));
}

function snapshotFromOrderRow(row: {
  delivery_date?: string | null;
  delivery_window?: string | null;
  address?: string | null;
  delivery_google_maps_url?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  order_json?: Record<string, unknown> | null;
}): DeliveryDetailsSnapshot {
  const json = row.order_json as Order | null | undefined;
  const delivery = json?.delivery;
  const windowRaw = row.delivery_window?.trim() || null;
  const window: DeliveryWindow | null =
    windowRaw && isDeliveryWindow(windowRaw)
      ? windowRaw
      : windowRaw
        ? deliveryWindowFromTimeSlot(windowRaw)
        : delivery?.preferredTimeSlot
          ? deliveryWindowFromTimeSlot(delivery.preferredTimeSlot)
          : null;

  const surprise = delivery?.surpriseDelivery;
  return {
    delivery_date: row.delivery_date?.trim() || null,
    delivery_window: window,
    address: row.address?.trim() || delivery?.address?.trim() || null,
    delivery_google_maps_url:
      row.delivery_google_maps_url?.trim() || delivery?.deliveryGoogleMapsUrl?.trim() || null,
    recipient_name: row.recipient_name?.trim() || delivery?.recipientName?.trim() || null,
    recipient_phone: row.recipient_phone?.trim() || delivery?.recipientPhone?.trim() || null,
    notes: delivery?.notes?.trim() || null,
    surprise_delivery: typeof surprise === 'boolean' ? surprise : null,
  };
}

export type UpdateOrderDeliveryDetailsResult =
  | {
      ok: true;
      order: {
        order_id: string;
        delivery_date: string | null;
        delivery_window: string | null;
        address: string | null;
        delivery_google_maps_url: string | null;
        recipient_name: string | null;
        recipient_phone: string | null;
        order_status: string | null;
        updated_at: string | null;
      };
      from: Partial<DeliveryDetailsSnapshot>;
      to: Partial<DeliveryDetailsSnapshot>;
      changedFields: string[];
    }
  | { ok: false; error: string; status: number };

/**
 * Admin dual-write of delivery details into normalized columns + order_json.delivery.
 * Does not change pricing. Rejects DELIVERED / CANCELLED orders.
 */
export async function updateOrderDeliveryDetails(
  orderId: string,
  patch: DeliveryDetailsPatch
): Promise<UpdateOrderDeliveryDetailsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  const id = orderId.trim();
  if (!id) {
    return { ok: false, error: 'order_id required', status: 400 };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select(
      'order_id, order_status, delivery_date, delivery_window, address, delivery_google_maps_url, recipient_name, recipient_phone, order_json'
    )
    .eq('order_id', id)
    .single();

  if (fetchError || !existing) {
    return { ok: false, error: 'Order not found', status: 404 };
  }

  const status = normalizeOrderStatus(existing.order_status);
  if (status === 'DELIVERED' || status === 'CANCELLED') {
    return {
      ok: false,
      error: `Cannot edit delivery details when order status is ${status}`,
      status: 400,
    };
  }

  const current = snapshotFromOrderRow(existing);
  const built = buildDeliveryUpdatePayload(current, patch);
  if ('error' in built) {
    return { ok: false, error: built.error, status: 400 };
  }

  const existingJson =
    existing.order_json && typeof existing.order_json === 'object'
      ? (existing.order_json as Record<string, unknown>)
      : {};
  const existingDelivery =
    existingJson.delivery && typeof existingJson.delivery === 'object'
      ? (existingJson.delivery as Record<string, unknown>)
      : {};

  const nextJson: Record<string, unknown> = {
    ...existingJson,
    delivery: {
      ...existingDelivery,
      ...built.deliveryJsonPatch,
    },
  };

  const updatedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      ...built.columnUpdates,
      order_json: nextJson,
      updated_at: updatedAt,
    })
    .eq('order_id', id)
    .select(
      'order_id, delivery_date, delivery_window, address, delivery_google_maps_url, recipient_name, recipient_phone, order_status, updated_at'
    )
    .single();

  if (updateError || !updated) {
    console.error('[orders/supabase] updateOrderDeliveryDetails error:', updateError);
    return {
      ok: false,
      error: updateError?.message ?? 'Failed to update delivery details',
      status: 500,
    };
  }

  return {
    ok: true,
    order: {
      order_id: updated.order_id,
      delivery_date: updated.delivery_date ?? null,
      delivery_window: updated.delivery_window ?? null,
      address: updated.address ?? null,
      delivery_google_maps_url: updated.delivery_google_maps_url ?? null,
      recipient_name: updated.recipient_name ?? null,
      recipient_phone: updated.recipient_phone ?? null,
      order_status: updated.order_status ?? null,
      updated_at: updated.updated_at ?? updatedAt,
    },
    from: built.from,
    to: built.to,
    changedFields: built.changedFields,
  };
}

