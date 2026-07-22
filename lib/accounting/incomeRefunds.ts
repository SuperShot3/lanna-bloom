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
  notes?: string | null;
  createdBy: string;
}): Promise<{ ok: true; refundId: string } | { ok: false; error: string; status: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured', status: 503 };

  const refundedAt = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      order_id: params.orderId.trim(),
      amount: Math.round(params.amount * 100) / 100,
      currency: 'THB',
      refunded_at: refundedAt,
      source: 'manual',
      stripe_refund_id: null,
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

  const orderId = await findOrderIdByStripePaymentIntent(piId);
  if (!orderId) {
    console.warn('[incomeRefunds] No order for payment_intent', piId);
    return { recorded: false, reason: 'order_not_found' };
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
 * Sum of Stripe-originated refunds with `refunded_at` on or before `dateTo` (inclusive).
 * Used for “where the money is”: refunds reduce cash held in Stripe.
 */
export async function getStripeRefundsTotalThroughDate(dateTo: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const end = dateTo.slice(0, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .select('amount')
    .eq('source', 'stripe')
    .lte('refunded_at', end);

  if (error) {
    console.error('[incomeRefunds] getStripeRefundsTotalThroughDate error:', error.message);
    return 0;
  }
  let sum = 0;
  for (const row of data ?? []) {
    sum += parseFloat(String((row as { amount?: unknown }).amount)) || 0;
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
