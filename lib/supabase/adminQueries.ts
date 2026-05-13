import 'server-only';
import { getSupabaseAdmin } from './server';

export type PaymentMethod = 'STRIPE' | 'PROMPTPAY' | 'BANK_TRANSFER';

export interface SupabaseOrderRow {
  order_id: string;
  public_token: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_email: string | null;
  phone: string | null;
  /** ITU calling code digits for customer phone at checkout (e.g. 66). */
  phone_country_code?: string | null;
  address: string | null;
  delivery_destination?: string | null;
  delivery_zone?: string | null;
  postal_code?: string | null;
  district: string | null;
  delivery_window: string | null;
  delivery_date: string | null;
  order_status: string | null;
  payment_status: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  items_total: number | null;
  delivery_fee: number | null;
  grand_total: number | null;
  total_amount: number | null;
  cogs_amount: number | null;
  delivery_cost: number | null;
  payment_fee: number | null;
  created_at: string | null;
  updated_at: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  /** ITU calling code digits for recipient phone when ordering for someone else. */
  recipient_phone_country_code?: string | null;
  contact_preference: string | null;
  referral_code: string | null;
  referral_discount: number | null;
  internal_notes: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  delivery_google_maps_url: string | null;
  fulfillment_status: string | null;
  fulfillment_status_updated_at: string | null;
  /** GA4: true after backend sent purchase via Measurement Protocol (prevents duplicate). */
  ga4_purchase_sent?: boolean | null;
  ga4_purchase_sent_at?: string | null;
  /** Optional GA client_id from frontend for server-side purchase attribution. */
  ga_client_id?: string | null;
  /** Full order payload; items include addOns (card, wrapping, message). */
  order_json?: Record<string, unknown> | null;
  /** True after admin was notified once at order creation (one email per order). */
  admin_notified?: boolean | null;
  admin_notified_at?: string | null;
  /** Set when post-delivery customer email was sent (at most once per order). */
  delivered_email_sent_at?: string | null;
  /** LINE OA handoff (optional). */
  line_user_id?: string | null;
  order_source?: string | null;
  last_line_push_status?: string | null;
  last_line_push_at?: string | null;
  /** 1 = pending delivery pipeline; 0 = DELIVERED/CANCELLED — for admin list sort (generated column). */
  admin_needs_delivery_sort?: number | null;
  confirmed_supplier_request_id?: string | null;
  confirmed_shop_id?: string | null;
  confirmed_supplier_shop_name?: string | null;
  confirmed_supplier_price?: number | null;
  confirmed_supplier_ready_time?: string | null;
  confirmed_supplier_confirmed_at?: string | null;
}

export interface SupabaseOrderItemRow {
  id?: string | number;
  order_id: string;
  bouquet_id: string | null;
  bouquet_title: string | null;
  size: string | null;
  price: number | null;
  image_url_snapshot: string | null;
  /** 'bouquet' | 'product' — for profit tracking (added in migration) */
  item_type?: string | null;
  /** Partner cost (for products) — for COGS auto-fill */
  cost?: number | null;
  /** Platform commission (for products) */
  commission_amount?: number | null;
}

/** Add-on data for display (from order_json when available). */
export interface OrderItemAddOnsDisplay {
  cardType?: 'free' | 'premium' | null;
  wrappingOption?: string | null;
  cardMessage?: string | null;
  balloonText?: string | null;
}

export interface SupabaseStatusHistoryRow {
  order_id: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string | null;
}

export interface SupplierOrderRequestRow {
  id: string;
  order_id: string;
  shop_id: string;
  shop_name_snapshot: string;
  public_token: string;
  status: string;
  product_snapshot: Record<string, unknown>;
  preparation_snapshot: Record<string, unknown>;
  pickup_snapshot: Record<string, unknown>;
  message_card_snapshot: Record<string, unknown>;
  supplier_response_type: string | null;
  supplier_price: number | null;
  supplier_ready_time: string | null;
  supplier_reason: string | null;
  supplier_notes: string | null;
  opened_at: string | null;
  responded_at: string | null;
  approved_at: string | null;
  disabled_at: string | null;
  expires_at: string | null;
  created_by_admin_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Latest supplier request snapshot for dispatch board (serializable to the client). */
export interface DeliveryBoardSupplierRequestSummary {
  order_id: string;
  shop_name_snapshot: string;
  status: string;
  supplier_response_type: string | null;
  supplier_price: number | null;
  supplier_ready_time: string | null;
  supplier_reason: string | null;
  supplier_notes: string | null;
  responded_at: string | null;
  created_at: string | null;
}

export interface SupplierOrderRequestEventRow {
  id: string;
  request_id: string;
  order_id: string;
  event_type: string;
  event_message: string;
  created_by: string | null;
  created_at: string | null;
}

export interface OrdersFilters {
  orderId?: string;
  recipientPhone?: string;
  /** OR-search across order_id, recipient_name, recipient_phone (ilike). */
  q?: string;
  orderStatus?: string;
  paymentStatus?: 'paid' | 'unpaid';
  district?: string;
  deliveryDestination?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
}

export interface OrdersPagination {
  page: number;
  pageSize: number;
}

export interface GetOrdersResult {
  orders: SupabaseOrderRow[];
  total: number;
  error?: string;
}

export async function getOrders(
  filters: OrdersFilters,
  pagination: OrdersPagination
): Promise<GetOrdersResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { orders: [], total: 0, error: 'Supabase not configured' };
  }

  try {
    const listColumns =
      'order_id, public_token, payment_method, customer_name, customer_email, phone, phone_country_code, address, delivery_destination, delivery_zone, postal_code, district, delivery_window, delivery_date, order_status, payment_status, stripe_session_id, stripe_payment_intent_id, paid_at, items_total, delivery_fee, grand_total, total_amount, cogs_amount, delivery_cost, payment_fee, created_at, updated_at, recipient_name, recipient_phone, recipient_phone_country_code, contact_preference, referral_code, referral_discount, internal_notes, driver_name, driver_phone, delivery_google_maps_url, fulfillment_status, fulfillment_status_updated_at, admin_needs_delivery_sort, order_json, confirmed_supplier_shop_name, confirmed_supplier_price, confirmed_supplier_ready_time, confirmed_supplier_confirmed_at';
    let query = supabase
      .from('orders')
      .select(listColumns, { count: 'exact' });

    const qTrim = filters.q
      ?.trim()
      .replace(/[,()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (qTrim) {
      const esc = qTrim.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const pat = `%${esc}%`;
      query = query.or(
        `order_id.ilike.${pat},recipient_name.ilike.${pat},recipient_phone.ilike.${pat}`
      );
    } else {
      if (filters.orderId?.trim()) {
        query = query.ilike('order_id', `%${filters.orderId.trim()}%`);
      }
      if (filters.recipientPhone?.trim()) {
        query = query.ilike('recipient_phone', `%${filters.recipientPhone.trim()}%`);
      }
    }
    if (filters.orderStatus && filters.orderStatus !== 'all') {
      query = query.eq('order_status', filters.orderStatus);
    }
    if (filters.paymentStatus === 'paid') {
      query = query.eq('payment_status', 'PAID');
    } else if (filters.paymentStatus === 'unpaid') {
      query = query.neq('payment_status', 'PAID');
    }
    if (filters.district && filters.district !== 'all') {
      query = query.eq('district', filters.district);
    }
    if (filters.deliveryDestination && filters.deliveryDestination !== 'all') {
      query = query.eq('delivery_destination', filters.deliveryDestination);
    }
    if (filters.deliveryDateFrom) {
      query = query.gte('delivery_date', filters.deliveryDateFrom);
    }
    if (filters.deliveryDateTo) {
      query = query.lte('delivery_date', filters.deliveryDateTo);
    }

    // Dispatch board: active deliveries first, then by delivery date and window.
    query = query
      .order('admin_needs_delivery_sort', { ascending: false, nullsFirst: false })
      .order('delivery_date', { ascending: true, nullsFirst: false })
      .order('delivery_window', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const offset = (pagination.page - 1) * pagination.pageSize;
    const { data, count, error } = await query
      .range(offset, offset + pagination.pageSize - 1);

    if (error) {
      console.error('[admin] getOrders error:', error);
      return { orders: [], total: 0, error: error.message };
    }

    return {
      orders: (data ?? []) as SupabaseOrderRow[],
      total: count ?? 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin] getOrders exception:', msg);
    return { orders: [], total: 0, error: msg };
  }
}

/**
 * One row per order_id: the supplier_order_requests row with the latest created_at.
 * Used on the delivery board to review supplier task replies without N+1 queries.
 */
export async function getLatestSupplierRequestSummariesForOrders(
  orderIds: string[]
): Promise<Record<string, DeliveryBoardSupplierRequestSummary>> {
  const supabase = getSupabaseAdmin();
  if (!supabase || orderIds.length === 0) return {};

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of orderIds) {
    const t = String(id ?? '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    unique.push(t);
  }
  if (unique.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('supplier_order_requests')
      .select(
        'order_id, shop_name_snapshot, status, supplier_response_type, supplier_price, supplier_ready_time, supplier_reason, supplier_notes, responded_at, created_at'
      )
      .in('order_id', unique);

    if (error) {
      console.error('[admin] getLatestSupplierRequestSummariesForOrders:', error);
      return {};
    }

    const rows = (data ?? []) as DeliveryBoardSupplierRequestSummary[];
    const best = new Map<string, DeliveryBoardSupplierRequestSummary>();
    for (const row of rows) {
      const oid = row.order_id;
      const prev = best.get(oid);
      if (!prev) {
        best.set(oid, row);
        continue;
      }
      const prevT = prev.created_at ?? '';
      const nextT = row.created_at ?? '';
      if (nextT > prevT) best.set(oid, row);
    }

    return Object.fromEntries(best);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin] getLatestSupplierRequestSummariesForOrders exception:', msg);
    return {};
  }
}

export interface OrderDetailResult {
  order: SupabaseOrderRow | null;
  items: SupabaseOrderItemRow[];
  statusHistory: SupabaseStatusHistoryRow[];
  error?: string;
}

export async function getOrderByOrderId(orderId: string): Promise<OrderDetailResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { order: null, items: [], statusHistory: [], error: 'Supabase not configured' };
  }

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return { order: null, items: [], statusHistory: [] };
      }
      console.error('[admin] getOrderByOrderId order error:', orderError);
      return { order: null, items: [], statusHistory: [], error: orderError.message };
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('bouquet_id');

    const { data: history } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    return {
      order: order as SupabaseOrderRow,
      items: (items ?? []) as SupabaseOrderItemRow[],
      statusHistory: (history ?? []) as SupabaseStatusHistoryRow[],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin] getOrderByOrderId exception:', msg);
    return { order: null, items: [], statusHistory: [], error: msg };
  }
}

export async function getOrdersForExport(
  filters: OrdersFilters,
  limit = 5000
): Promise<SupabaseOrderRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    let query = supabase.from('orders').select('*');

    const qTrimEx = filters.q
      ?.trim()
      .replace(/[,()"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (qTrimEx) {
      const esc = qTrimEx.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const pat = `%${esc}%`;
      query = query.or(
        `order_id.ilike.${pat},recipient_name.ilike.${pat},recipient_phone.ilike.${pat}`
      );
    } else {
      if (filters.orderId?.trim()) {
        query = query.ilike('order_id', `%${filters.orderId.trim()}%`);
      }
      if (filters.recipientPhone?.trim()) {
        query = query.ilike('recipient_phone', `%${filters.recipientPhone.trim()}%`);
      }
    }
    if (filters.orderStatus && filters.orderStatus !== 'all') {
      query = query.eq('order_status', filters.orderStatus);
    }
    if (filters.paymentStatus === 'paid') {
      query = query.eq('payment_status', 'PAID');
    } else if (filters.paymentStatus === 'unpaid') {
      query = query.neq('payment_status', 'PAID');
    }
    if (filters.district && filters.district !== 'all') {
      query = query.eq('district', filters.district);
    }
    if (filters.deliveryDestination && filters.deliveryDestination !== 'all') {
      query = query.eq('delivery_destination', filters.deliveryDestination);
    }
    if (filters.deliveryDateFrom) {
      query = query.gte('delivery_date', filters.deliveryDateFrom);
    }
    if (filters.deliveryDateTo) {
      query = query.lte('delivery_date', filters.deliveryDateTo);
    }

    const { data, error } = await query
      .order('admin_needs_delivery_sort', { ascending: false, nullsFirst: false })
      .order('delivery_date', { ascending: true, nullsFirst: false })
      .order('delivery_window', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[admin] getOrdersForExport error:', error);
      return [];
    }
    return (data ?? []) as SupabaseOrderRow[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin] getOrdersForExport exception:', msg);
    return [];
  }
}

/**
 * Fetch payment status from Supabase for customer order page.
 * Best-effort; returns null if Supabase unavailable or order not found.
 * Used to overlay Supabase payment_status on legacy order display.
 */
export async function getSupabasePaymentStatusByOrderId(orderId: string): Promise<{
  payment_status: string | null;
  order_status: string | null;
  paid_at: string | null;
  payment_method: string | null;
  fulfillment_status: string | null;
  fulfillment_status_updated_at: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  updated_at: string | null;
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = String(orderId ?? '').trim();
  if (!normalized) return null;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('payment_status, order_status, paid_at, payment_method, fulfillment_status, fulfillment_status_updated_at, driver_name, driver_phone, updated_at')
      .eq('order_id', normalized)
      .single();

    if (error || !data) return null;
    return data as {
      payment_status: string | null;
      order_status: string | null;
      paid_at: string | null;
      payment_method: string | null;
      fulfillment_status: string | null;
      fulfillment_status_updated_at: string | null;
      driver_name: string | null;
      driver_phone: string | null;
      updated_at: string | null;
    };
  } catch {
    return null;
  }
}

export async function getSupabaseOrderStatusHistoryByOrderId(
  orderId: string
): Promise<SupabaseStatusHistoryRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const normalized = String(orderId ?? '').trim();
  if (!normalized) return [];

  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('order_id, from_status, to_status, created_at')
      .eq('order_id', normalized)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as SupabaseStatusHistoryRow[];
  } catch {
    return [];
  }
}

export async function getDistricts(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('orders')
    .select('district')
    .not('district', 'is', null);

  const districts = Array.from(new Set((data ?? []).map((r) => r.district).filter(Boolean))) as string[];
  return districts.sort();
}

export async function getDeliveryDestinations(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('orders')
    .select('delivery_destination')
    .not('delivery_destination', 'is', null);

  const ids = Array.from(
    new Set((data ?? []).map((r) => r.delivery_destination).filter(Boolean))
  ) as string[];
  return ids.sort();
}

export async function getSupplierRequestsForOrder(orderId: string): Promise<SupplierOrderRequestRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const normalized = String(orderId ?? '').trim();
  if (!normalized) return [];

  try {
    const { data, error } = await supabase
      .from('supplier_order_requests')
      .select('*')
      .eq('order_id', normalized)
      .order('created_at', { ascending: false });

    if (error || !data) {
      if (error) console.error('[admin] getSupplierRequestsForOrder error:', error);
      return [];
    }
    return data as SupplierOrderRequestRow[];
  } catch (e) {
    console.error('[admin] getSupplierRequestsForOrder exception:', e);
    return [];
  }
}

export async function getLatestSupplierRequestForOrder(
  orderId: string
): Promise<SupplierOrderRequestRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = String(orderId ?? '').trim();
  if (!normalized) return null;

  try {
    const { data, error } = await supabase
      .from('supplier_order_requests')
      .select('*')
      .eq('order_id', normalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as SupplierOrderRequestRow;
  } catch {
    return null;
  }
}

export async function getSupplierRequestEventsForOrder(
  orderId: string
): Promise<SupplierOrderRequestEventRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const normalized = String(orderId ?? '').trim();
  if (!normalized) return [];

  try {
    const { data, error } = await supabase
      .from('supplier_order_request_events')
      .select('*')
      .eq('order_id', normalized)
      .order('created_at', { ascending: true });

    if (error || !data) {
      if (error) console.error('[admin] getSupplierRequestEventsForOrder error:', error);
      return [];
    }
    return data as SupplierOrderRequestEventRow[];
  } catch (e) {
    console.error('[admin] getSupplierRequestEventsForOrder exception:', e);
    return [];
  }
}
