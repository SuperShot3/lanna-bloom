import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getOrderById, getOrderDetailsUrl } from '@/lib/orders';
import { sendCustomerConfirmationEmail } from '@/lib/orderEmail';

const MANUAL_PAYMENT_METHODS = ['PROMPTPAY', 'BANK_TRANSFER'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  if (!order_id?.trim()) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, payment_method, payment_status')
    .eq('order_id', order_id.trim())
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const paymentMethod = (existing.payment_method ?? 'BANK_TRANSFER').toUpperCase();
  if (paymentMethod === 'STRIPE') {
    return NextResponse.json(
      { error: 'Stripe orders are updated automatically via webhook. Cannot mark as paid manually.' },
      { status: 400 }
    );
  }

  if (!MANUAL_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json(
      { error: 'Only PROMPTPAY and BANK_TRANSFER orders can be marked as paid manually.' },
      { status: 400 }
    );
  }

  const previousPaymentStatus = (existing.payment_status ?? 'NOT_PAID').toUpperCase();

  if (previousPaymentStatus === 'PAID') {
    return NextResponse.json({ ok: true, order: existing, message: 'Already paid (idempotent)' });
  }

  const updatePayload: Record<string, unknown> = {
    payment_status: 'PAID',
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('order_id', order_id.trim())
    .select()
    .single();

  if (error) {
    console.error('[admin] mark-paid update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'MANUAL_MARK_PAID', order_id.trim(), {
    payment_status: { from: previousPaymentStatus, to: 'PAID' },
  });

  // GA4 purchase: browser/GTM on /lanna-order-thank-you for Stripe web flow only.

  // Create income record (idempotent, fire-and-forget). paidAt comes from
  // the order's paid_at column we just wrote so the income row's paid_date
  // matches the day the money was received.
  // Optional: defer to manual Income tab (ACCOUNTING_MANUAL_PAID_INCOME_DEFERRED).
  const deferIncome = (await import('@/lib/accounting/manualIncomePolicy')).shouldDeferManualPaidIncomeUpsert();
  if (!deferIncome) {
    void import('@/lib/accounting/upsertOrderIncome').then(({ upsertOrderIncome }) =>
      upsertOrderIncome({
        orderId:       order_id.trim(),
        amount:        updated.grand_total ?? updated.items_total ?? 0,
        currency:      'THB',
        paymentMethod: updated.payment_method,
        paidAt:        updated.paid_at ?? null,
        createdBy:     `admin:${adminEmail}`,
      }).catch((e) => console.error('[admin/mark-paid] income upsert error:', e))
    );
  }

  // Payment-confirmation only: customer email. No admin email here (admin is notified once at order placement).
  const trimmedId = order_id.trim();
  getOrderById(trimmedId).then(async (fullOrder) => {
    if (!fullOrder) return;
    const { getOrderPublicToken } = await import('@/lib/orders');
    const publicToken = await getOrderPublicToken(trimmedId);
    const detailsUrl = getOrderDetailsUrl(trimmedId, { token: publicToken });
    sendCustomerConfirmationEmail(fullOrder, detailsUrl).catch((e) =>
      console.error('[admin/mark-paid] Customer confirmation email failed:', e)
    );
  }).catch((e) => {
    console.error('[admin/mark-paid] Failed to fetch order for email:', e);
  });

  return NextResponse.json({ ok: true, order: updated });
}
