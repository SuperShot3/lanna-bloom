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
  address: string | null;
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
  contact_preference: string | null;
  referral_code: string | null;
  referral_discount: number | null;
  internal_notes: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  delivery_google_maps_url: string | null;
}

export interface SupabaseOrderItemRow {
  order_id: string;
  bouquet_id: string | null;
  bouquet_title: string | null;
  size: string | null;
  price: number | null;
  image_url_snapshot: string | null;
}

export interface SupabaseStatusHistoryRow {
  order_id: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string | null;
}

export interface OrdersFilters {
  orderId?: string;
  recipientPhone?: string;
  orderStatus?: string;
  paymentStatus?: 'paid' | 'unpaid';
  district?: string;
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
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' });

    if (filters.orderId?.trim()) {
      query = query.ilike('order_id', `%${filters.orderId.trim()}%`);
    }
    if (filters.recipientPhone?.trim()) {
      query = query.ilike('recipient_phone', `%${filters.recipientPhone.trim()}%`);
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
    if (filters.deliveryDateFrom) {
      query = query.gte('delivery_date', filters.deliveryDateFrom);
    }
    if (filters.deliveryDateTo) {
      query = query.lte('delivery_date', filters.deliveryDateTo);
    }

    query = query.order('created_at', { ascending: false });

    const offset = (pagination.page - 1) * pagination.pageSize;
    const { data, count, error } = await query
      .range(offset, offset + pagination.pageSize - 1);

    if (error) {
      console.error('[admin-v2] getOrders error:', error);
      return { orders: [], total: 0, error: error.message };
    }

    return {
      orders: (data ?? []) as SupabaseOrderRow[],
      total: count ?? 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin-v2] getOrders exception:', msg);
    return { orders: [], total: 0, error: msg };
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
      console.error('[admin-v2] getOrderByOrderId order error:', orderError);
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
    console.error('[admin-v2] getOrderByOrderId exception:', msg);
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

    if (filters.orderId?.trim()) {
      query = query.ilike('order_id', `%${filters.orderId.trim()}%`);
    }
    if (filters.recipientPhone?.trim()) {
      query = query.ilike('recipient_phone', `%${filters.recipientPhone.trim()}%`);
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
    if (filters.deliveryDateFrom) {
      query = query.gte('delivery_date', filters.deliveryDateFrom);
    }
    if (filters.deliveryDateTo) {
      query = query.lte('delivery_date', filters.deliveryDateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

    if (error) {
      console.error('[admin-v2] getOrdersForExport error:', error);
      return [];
    }
    return (data ?? []) as SupabaseOrderRow[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin-v2] getOrdersForExport exception:', msg);
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
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('payment_status, order_status, paid_at, payment_method')
      .eq('order_id', orderId)
      .single();

    if (error || !data) return null;
    return data as {
      payment_status: string | null;
      order_status: string | null;
      paid_at: string | null;
      payment_method: string | null;
    };
  } catch {
    return null;
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
