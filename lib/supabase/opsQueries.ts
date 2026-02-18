import 'server-only';
import { getSupabaseAdmin } from './server';

export interface TodayStats {
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  profit: number;
  profitCoverage: number; // % of paid orders with costs set
}

export interface NeedsAttentionItem {
  order_id: string;
  reason: string;
  order_status?: string;
  payment_status?: string;
  paid_at?: string | null;
}

export interface NeedsAttention {
  paidNotAccepted: NeedsAttentionItem[];
  preparingStale: NeedsAttentionItem[];
  outForDeliveryStale: NeedsAttentionItem[];
  missingCriticalFields: NeedsAttentionItem[];
  paidMissingCosts: NeedsAttentionItem[];
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getTodayStats(): Promise<TodayStats> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      totalOrders: 0,
      paidOrders: 0,
      revenue: 0,
      profit: 0,
      profitCoverage: 0,
    };
  }

  const startOfToday = todayStart();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_id, payment_status, total_amount, grand_total, cogs_amount, delivery_cost, payment_fee')
    .gte('created_at', startOfToday);

  if (error) {
    console.error('[ops] getTodayStats error:', error);
    return {
      totalOrders: 0,
      paidOrders: 0,
      revenue: 0,
      profit: 0,
      profitCoverage: 0,
    };
  }

  const list = orders ?? [];
  const totalOrders = list.length;
  const paidOrders = list.filter((o) => o.payment_status === 'PAID').length;
  const revenue = list
    .filter((o) => o.payment_status === 'PAID')
    .reduce((sum, o) => sum + (o.total_amount ?? o.grand_total ?? 0), 0);
  const paidWithCosts = list.filter(
    (o) =>
      o.payment_status === 'PAID' &&
      o.cogs_amount != null &&
      o.delivery_cost != null &&
      o.payment_fee != null
  );
  const profit = paidWithCosts.reduce((sum, o) => {
    const total = o.total_amount ?? o.grand_total ?? 0;
    const cogs = o.cogs_amount ?? 0;
    const delivery = o.delivery_cost ?? 0;
    const fee = o.payment_fee ?? 0;
    return sum + (total - cogs - delivery - fee);
  }, 0);
  const profitCoverage = paidOrders > 0 ? (paidWithCosts.length / paidOrders) * 100 : 0;

  return {
    totalOrders,
    paidOrders,
    revenue,
    profit,
    profitCoverage,
  };
}

export async function getNeedsAttention(): Promise<NeedsAttention> {
  const supabase = getSupabaseAdmin();
  const empty: NeedsAttention = {
    paidNotAccepted: [],
    preparingStale: [],
    outForDeliveryStale: [],
    missingCriticalFields: [],
    paidMissingCosts: [],
  };

  if (!supabase) return empty;

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000).toISOString();

  const { data: allOrders, error } = await supabase
    .from('orders')
    .select(
      'order_id, order_status, payment_status, paid_at, recipient_phone, address, delivery_date, delivery_window, cogs_amount, delivery_cost, payment_fee'
    )
    .in('order_status', [
      'PAID',
      'ACCEPTED',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'READY_FOR_DISPATCH',
    ]);

  if (error) {
    console.error('[ops] getNeedsAttention error:', error);
    return empty;
  }

  const orders = allOrders ?? [];

  const paidNotAccepted: NeedsAttentionItem[] = orders
    .filter(
      (o) =>
        o.payment_status === 'PAID' &&
        o.order_status === 'PAID' &&
        o.paid_at &&
        o.paid_at < tenMinutesAgo
    )
    .map((o) => ({
      order_id: o.order_id,
      reason: 'PAID but not ACCEPTED within 10 minutes',
      order_status: o.order_status ?? undefined,
      payment_status: o.payment_status ?? undefined,
      paid_at: o.paid_at,
    }));

  const preparingStale: NeedsAttentionItem[] = orders
    .filter((o) => o.order_status === 'PREPARING' && o.paid_at && o.paid_at < ninetyMinutesAgo)
    .map((o) => ({
      order_id: o.order_id,
      reason: 'PREPARING older than 90 minutes',
      order_status: o.order_status ?? undefined,
      payment_status: o.payment_status ?? undefined,
      paid_at: o.paid_at,
    }));

  const outForDeliveryStale: NeedsAttentionItem[] = orders
    .filter(
      (o) =>
        o.order_status === 'OUT_FOR_DELIVERY' &&
        o.paid_at &&
        o.paid_at < twoHoursAgo
    )
    .map((o) => ({
      order_id: o.order_id,
      reason: 'OUT_FOR_DELIVERY older than 120 minutes',
      order_status: o.order_status ?? undefined,
      payment_status: o.payment_status ?? undefined,
      paid_at: o.paid_at,
    }));

  const missingCriticalFields: NeedsAttentionItem[] = orders
    .filter(
      (o) =>
        o.payment_status === 'PAID' &&
        (!o.recipient_phone?.trim() ||
          !o.address?.trim() ||
          !o.delivery_date?.trim() ||
          !o.delivery_window?.trim())
    )
    .map((o) => {
      const missing: string[] = [];
      if (!o.recipient_phone?.trim()) missing.push('recipient_phone');
      if (!o.address?.trim()) missing.push('address');
      if (!o.delivery_date?.trim()) missing.push('delivery_date');
      if (!o.delivery_window?.trim()) missing.push('delivery_window');
      return {
        order_id: o.order_id,
        reason: `Missing: ${missing.join(', ')}`,
        order_status: o.order_status ?? undefined,
        payment_status: o.payment_status ?? undefined,
      };
    });

  const paidMissingCosts: NeedsAttentionItem[] = orders
    .filter(
      (o) =>
        o.payment_status === 'PAID' &&
        (o.cogs_amount == null || o.delivery_cost == null || o.payment_fee == null)
    )
    .map((o) => ({
      order_id: o.order_id,
      reason: 'Paid order missing costs',
      order_status: o.order_status ?? undefined,
      payment_status: o.payment_status ?? undefined,
    }));

  return {
    paidNotAccepted,
    preparingStale,
    outForDeliveryStale,
    missingCriticalFields,
    paidMissingCosts,
  };
}
