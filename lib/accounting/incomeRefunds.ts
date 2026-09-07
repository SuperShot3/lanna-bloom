import 'server-only';

import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { stripeAmountMinorToMajor } from '@/lib/stripe/stripeAmountMinorToMajor';

const TABLE = 'income_refunds';

function refundTimestampToYmd(createdSeconds: number): string {
  const d = new Date(createdSeconds * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function findOrderIdByStripePaymentIntent(paymentIntentId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('order_id')
    .eq('stripe_payment_intent_id', paymentIntentId.trim())
    .maybeSingle();
  if (error) {
    console.error('[incomeRefunds] findOrderByPI error:', error.message);
    return null;
  }
  return data?.order_id ? String(data.order_id) : null;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

export async function orderHasIncomeRefund(orderId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from(TABLE)
    .select('id')
    .eq('order_id', orderId.trim())
    .limit(1);
  if (error) {
    console.error('[incomeRefunds] orderHasIncomeRefund error:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function insertManualIncomeRefund(params: {
  orderId: string;
  amount: number;
  retainedFeeAmount?: number | null;
  notes?: string | null;
  createdBy: string;
}): Promise<{ ok: true; refundId: string } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured', status: 503 };

  const refundedAt = new Date().toISOString().slice(0, 10);
  const retained =
    params.retainedFeeAmount != null && Number.isFinite(params.retainedFeeAmount) && params.retainedFeeAmount >= 0
      ? Math.round(params.retainedFeeAmount * 100) / 100
      : null;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      order_id: params.orderId.trim(),
      amount: Math.round(params.amount * 100) / 100,
      currency: 'THB',
      refunded_at: refundedAt,
      source: 'manual',
      stripe_refund_id: null,
      retained_fee_amount: retained,
      notes: params.notes ?? null,
      created_by: params.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[incomeRefunds] insertManualIncomeRefund error:', error.message);
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: true, refundId: String(data.id) };
}

/**
 * Persist a Stripe refund for accounting. Idempotent on `stripe_refund_id`.
 * If a matching manual admin refund already exists for the order/amount, link
 * `stripe_refund_id` (and promote source to stripe) instead of inserting again.
 */
export async function recordStripeRefundEvent(refund: Stripe.Refund): Promise<{ recorded: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { recorded: false, reason: 'Supabase not configured' };

  const stripeRefundId = refund.id;
  const piId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id ?? null;
  if (!piId) {
    return { recorded: false, reason: 'missing_payment_intent' };
  }

  let orderId = await findOrderIdByStripePaymentIntent(piId);
  if (!orderId) {
    const { findIncomeByStripePaymentIntentRef } = await import(
      '@/lib/accounting/upsertStripePaymentIntentIncome'
    );
    const income = await findIncomeByStripePaymentIntentRef(piId);
    orderId = income?.order_id ?? null;
    if (!income) {
      console.warn(
        '[incomeRefunds] No order or income for payment_intent; recording refund with null order_id',
        piId
      );
    }
  }

  const cur = (refund.currency ?? 'thb').toLowerCase();
  const major = stripeAmountMinorToMajor(refund.amount, cur);
  if (!Number.isFinite(major) || major <= 0) {
    return { recorded: false, reason: 'invalid_amount' };
  }
  const amountMajor = Math.round(major * 100) / 100;

  const refundedAtYmd =
    typeof refund.created === 'number'
      ? refundTimestampToYmd(refund.created)
      : new Date().toISOString().slice(0, 10);

  // Avoid double-count when admin already recorded this refund manually.
  if (orderId) {
    const { data: existingRows, error: existingError } = await supabase
      .from(TABLE)
      .select('id, amount, source, stripe_refund_id')
      .eq('order_id', orderId)
      .eq('source', 'manual')
      .is('stripe_refund_id', null);

    if (existingError) {
      console.error('[incomeRefunds] manual lookup error:', existingError.message);
    } else {
      const match = (existingRows ?? []).find((row) =>
        amountsMatch(parseFloat(String((row as { amount?: unknown }).amount)) || 0, amountMajor)
      ) as { id: string } | undefined;
      if (match?.id) {
        const { error: linkError } = await supabase
          .from(TABLE)
          .update({
            stripe_refund_id: stripeRefundId,
            source: 'stripe',
            refunded_at: refundedAtYmd,
          })
          .eq('id', match.id);
        if (linkError) {
          if (linkError.code === '23505') {
            return { recorded: false, reason: 'duplicate' };
          }
          console.error('[incomeRefunds] link manual refund error:', linkError.message);
          return { recorded: false, reason: linkError.message };
        }
        return { recorded: true, reason: 'linked_manual' };
      }
    }
  }

  const { error } = await supabase.from(TABLE).insert({
    order_id: orderId,
    amount: amountMajor,
    currency: cur.toUpperCase(),
    refunded_at: refundedAtYmd,
    source: 'stripe',
    stripe_refund_id: stripeRefundId,
    notes: null,
    created_by: 'system:stripe_webhook',
  });

  if (error) {
    if (error.code === '23505') {
      return { recorded: false, reason: 'duplicate' };
    }
    console.error('[incomeRefunds] insert error:', error.message);
    return { recorded: false, reason: error.message };
  }

  return { recorded: true };
}

/**
 * Sum of Stripe-channel refunds with `refunded_at` on or before `dateTo` (inclusive).
 * Used for “where the money is”: webhook Stripe refunds and admin refunds of
 * Stripe-paid orders reduce cash held in Stripe. Retained fees are not subtracted
 * here — they are already in the original income net (gross − fee).
 */
export async function getStripeRefundsTotalThroughDate(dateTo: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const end = dateTo.slice(0, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .select('amount, source, order_id')
    .lte('refunded_at', end);

  if (error) {
    console.error('[incomeRefunds] getStripeRefundsTotalThroughDate error:', error.message);
    return 0;
  }

  const rows = data ?? [];
  const orderIds = [
    ...new Set(
      rows
        .map((row) => String((row as { order_id?: unknown }).order_id ?? '').trim())
        .filter(Boolean)
    ),
  ];
  const stripeOrderIds = new Set<string>();
  if (orderIds.length > 0) {
    const { data: incomeRows, error: incomeError } = await supabase
      .from('income_records')
      .select('order_id, payment_method')
      .in('order_id', orderIds)
      .neq('income_status', 'cancelled');
    if (incomeError) {
      console.error('[incomeRefunds] stripe-channel income lookup error:', incomeError.message);
    } else {
      for (const row of incomeRows ?? []) {
        if (String((row as { payment_method?: unknown }).payment_method ?? '').toLowerCase() === 'stripe') {
          const oid = String((row as { order_id?: unknown }).order_id ?? '').trim();
          if (oid) stripeOrderIds.add(oid);
        }
      }
    }
  }

  let sum = 0;
  for (const row of rows) {
    const r = row as { amount?: unknown; source?: unknown; order_id?: unknown };
    const source = String(r.source ?? '').toLowerCase();
    const oid = String(r.order_id ?? '').trim();
    if (source === 'stripe' || (oid && stripeOrderIds.has(oid))) {
      sum += parseFloat(String(r.amount)) || 0;
    }
  }
  return Math.round(sum * 100) / 100;
}

/** Stripe-originated refunds only, for comparing to Stripe Dashboard net volume. */
export async function getStripeRefundsTotalInPeriod(filter: { dateFrom?: string; dateTo?: string }): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  let q = supabase.from(TABLE).select('amount').eq('source', 'stripe');
  if (filter.dateFrom) q = q.gte('refunded_at', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) q = q.lte('refunded_at', filter.dateTo.slice(0, 10));

  const { data, error } = await q;
  if (error) {
    console.error('[incomeRefunds] getStripeRefundsTotalInPeriod error:', error.message);
    return 0;
  }
  let sum = 0;
  for (const row of data ?? []) {
    sum += parseFloat(String((row as { amount?: unknown }).amount)) || 0;
  }
  return Math.round(sum * 100) / 100;
}

export async function getRefundsTotalInPeriod(filter: { dateFrom?: string; dateTo?: string }): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  let q = supabase.from(TABLE).select('amount');
  if (filter.dateFrom) q = q.gte('refunded_at', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) q = q.lte('refunded_at', filter.dateTo.slice(0, 10));

  const { data, error } = await q;
  if (error) {
    console.error('[incomeRefunds] getRefundsTotalInPeriod error:', error.message);
    return 0;
  }
  let sum = 0;
  for (const row of data ?? []) {
    sum += parseFloat(String((row as { amount?: unknown }).amount)) || 0;
  }
  return Math.round(sum * 100) / 100;
}

export type OverviewPeriodRefundRow = {
  order_id: string | null;
  amount: number;
  source: string;
  retained_fee_amount: number | null;
};

export async function getRefundsForOverviewPeriod(filter: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<OverviewPeriodRefundRow[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let q = supabase.from(TABLE).select('order_id, amount, source, retained_fee_amount');
  if (filter.dateFrom) q = q.gte('refunded_at', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) q = q.lte('refunded_at', filter.dateTo.slice(0, 10));

  const { data, error } = await q;
  if (error) {
    console.error('[incomeRefunds] getRefundsForOverviewPeriod error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as {
      order_id?: unknown;
      amount?: unknown;
      source?: unknown;
      retained_fee_amount?: unknown;
    };
    return {
      order_id: r.order_id != null && String(r.order_id).trim() ? String(r.order_id) : null,
      amount: parseFloat(String(r.amount)) || 0,
      source: String(r.source ?? ''),
      retained_fee_amount:
        r.retained_fee_amount != null && String(r.retained_fee_amount) !== ''
          ? parseFloat(String(r.retained_fee_amount)) || 0
          : null,
    };
  });
}

/** Income rows for refunded orders (any paid_date) — channel + fee fallback. */
export async function getIncomeLookupForRefundOrders(
  orderIds: string[]
): Promise<
  {
    order_id: string | null;
    amount: number;
    income_status: string;
    payment_method: string;
    processing_fee_amount: number | null;
  }[]
> {
  const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('income_records')
    .select('order_id, amount, income_status, payment_method, processing_fee_amount')
    .in('order_id', ids)
    .neq('income_status', 'cancelled');

  if (error) {
    console.error('[incomeRefunds] getIncomeLookupForRefundOrders error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as {
      order_id?: unknown;
      amount?: unknown;
      income_status?: unknown;
      payment_method?: unknown;
      processing_fee_amount?: unknown;
    };
    return {
      order_id: r.order_id != null && String(r.order_id).trim() ? String(r.order_id) : null,
      amount: parseFloat(String(r.amount)) || 0,
      income_status: String(r.income_status ?? ''),
      payment_method: String(r.payment_method ?? ''),
      processing_fee_amount:
        r.processing_fee_amount != null && String(r.processing_fee_amount) !== ''
          ? parseFloat(String(r.processing_fee_amount)) || 0
          : null,
    };
  });
}

export type IncomeRefundListRecord = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  refunded_at: string;
  source: string;
  stripe_refund_id: string | null;
  retained_fee_amount: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type IncomeRefundListResult = {
  records: IncomeRefundListRecord[];
  total: number;
  totalAmount: number;
  totalRetainedFee: number;
  error?: string;
};

export async function getIncomeRefunds(
  filter: { dateFrom?: string; dateTo?: string } = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 30 }
): Promise<IncomeRefundListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { records: [], total: 0, totalAmount: 0, totalRetainedFee: 0, error: 'Supabase not configured' };
  }

  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(TABLE).select('*', { count: 'exact' });
  if (filter.dateFrom) query = query.gte('refunded_at', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) query = query.lte('refunded_at', filter.dateTo.slice(0, 10));

  const { data, count, error } = await query
    .order('refunded_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[incomeRefunds] list error:', error.message);
    return { records: [], total: 0, totalAmount: 0, totalRetainedFee: 0, error: error.message };
  }

  let sumQuery = supabase.from(TABLE).select('amount, retained_fee_amount');
  if (filter.dateFrom) sumQuery = sumQuery.gte('refunded_at', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) sumQuery = sumQuery.lte('refunded_at', filter.dateTo.slice(0, 10));
  const { data: sumRows } = await sumQuery;

  let totalAmount = 0;
  let totalRetainedFee = 0;
  for (const row of sumRows ?? []) {
    const r = row as { amount?: unknown; retained_fee_amount?: unknown };
    totalAmount += parseFloat(String(r.amount)) || 0;
    if (r.retained_fee_amount != null && String(r.retained_fee_amount) !== '') {
      totalRetainedFee += parseFloat(String(r.retained_fee_amount)) || 0;
    }
  }

  const records: IncomeRefundListRecord[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      order_id: r.order_id != null && String(r.order_id).trim() ? String(r.order_id) : null,
      amount: parseFloat(String(r.amount)) || 0,
      currency: String(r.currency ?? 'THB'),
      refunded_at: String(r.refunded_at ?? '').slice(0, 10),
      source: String(r.source ?? ''),
      stripe_refund_id: r.stripe_refund_id != null ? String(r.stripe_refund_id) : null,
      retained_fee_amount:
        r.retained_fee_amount != null && String(r.retained_fee_amount) !== ''
          ? parseFloat(String(r.retained_fee_amount)) || 0
          : null,
      notes: r.notes != null ? String(r.notes) : null,
      created_by: r.created_by != null ? String(r.created_by) : null,
      created_at: String(r.created_at ?? ''),
    };
  });

  return {
    records,
    total: count ?? 0,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalRetainedFee: Math.round(totalRetainedFee * 100) / 100,
  };
}
