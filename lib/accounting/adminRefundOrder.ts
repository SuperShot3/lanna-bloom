import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { logAudit } from '@/lib/auditLog';
import {
  insertManualIncomeRefund,
  orderHasIncomeRefund,
} from '@/lib/accounting/incomeRefunds';

export type AdminRefundOrderInput = {
  orderId: string;
  amount: number;
  stripeCommission: number;
  notes?: string | null;
  createdBy: string;
};

export type AdminRefundOrderResult =
  | { ok: true; refundId: string }
  | { ok: false; error: string; status: number };

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Accept finite numbers; normalize to 2 decimal places. */
function parseMoneyField(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return roundMoney(n);
}

/**
 * Record an admin refund in Lanna Bloom accounting (does not call Stripe).
 * Inserts `income_refunds`, updates payment fee on order + income, cancels the order.
 */
export async function adminRefundOrder(input: AdminRefundOrderInput): Promise<AdminRefundOrderResult> {
  const orderId = input.orderId.trim();
  if (!orderId) {
    return { ok: false, error: 'order_id required', status: 400 };
  }

  const amount = parseMoneyField(input.amount);
  const commission = parseMoneyField(input.stripeCommission);
  if (amount == null || amount <= 0) {
    return { ok: false, error: 'amount must be a positive number with at most 2 decimals', status: 400 };
  }
  if (commission == null || commission < 0) {
    return {
      ok: false,
      error: 'stripe_commission must be a number ≥ 0 with at most 2 decimals',
      status: 400,
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  if (await orderHasIncomeRefund(orderId)) {
    return { ok: false, error: 'This order already has a recorded refund', status: 409 };
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select(
      'order_id, order_status, payment_status, payment_method, grand_total, total_amount, payment_fee'
    )
    .eq('order_id', orderId)
    .maybeSingle();

  if (fetchError || !order) {
    return { ok: false, error: 'Order not found', status: 404 };
  }

  const orderStatus = String(order.order_status ?? '').toUpperCase();
  if (orderStatus === 'CANCELLED') {
    return { ok: false, error: 'Order is already cancelled', status: 409 };
  }

  const paidTotal =
    roundMoney(parseFloat(String(order.grand_total ?? order.total_amount ?? 0)) || 0);
  if (amount > paidTotal + 0.001) {
    return {
      ok: false,
      error: `Refund amount cannot exceed order total (${paidTotal.toFixed(2)})`,
      status: 400,
    };
  }

  const paymentStatus = String(order.payment_status ?? '').toUpperCase();
  if (paymentStatus !== 'PAID') {
    return { ok: false, error: 'Only paid orders can be refunded', status: 400 };
  }

  const notes =
    typeof input.notes === 'string' && input.notes.trim()
      ? input.notes.trim().slice(0, 2000)
      : null;

  const insertRes = await insertManualIncomeRefund({
    orderId,
    amount,
    notes,
    createdBy: input.createdBy,
  });
  if (!insertRes.ok) {
    return { ok: false, error: insertRes.error, status: insertRes.status };
  }

  const now = new Date().toISOString();
  const previousOrderStatus = order.order_status ?? 'NEW';
  const previousPaymentStatus = order.payment_status ?? 'PAID';

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      order_status: 'CANCELLED',
      payment_status: 'CANCELLED',
      payment_fee: commission,
      updated_at: now,
    })
    .eq('order_id', orderId);

  if (orderUpdateError) {
    console.error('[adminRefundOrder] order update error:', orderUpdateError.message);
    return { ok: false, error: orderUpdateError.message, status: 500 };
  }

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: previousOrderStatus,
    to_status: 'CANCELLED',
    created_at: now,
  });

  const { data: incomeRows } = await supabase
    .from('income_records')
    .select('id')
    .eq('order_id', orderId)
    .neq('income_status', 'cancelled')
    .limit(1);

  const incomeId = incomeRows?.[0]?.id;
  if (incomeId) {
    const { error: incomeFeeError } = await supabase
      .from('income_records')
      .update({
        processing_fee_amount: commission,
        updated_at: now,
      })
      .eq('id', incomeId);
    if (incomeFeeError) {
      console.error('[adminRefundOrder] income fee update error:', incomeFeeError.message);
    }
  }

  await logAudit(input.createdBy, 'ORDER_REFUND', orderId, {
    amount,
    stripe_commission: commission,
    refund_id: insertRes.refundId,
    order_status_from: previousOrderStatus,
    payment_status_from: previousPaymentStatus,
    notes,
  });

  return { ok: true, refundId: insertRes.refundId };
}
