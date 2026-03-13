import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { PAYMENT_STATUS } from '@/lib/orders/statusConstants';

const VALID_PAYMENT_STATUSES = [...PAYMENT_STATUS];

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const paymentStatus = typeof body === 'object' && body !== null && 'payment_status' in body
    ? String((body as { payment_status?: unknown }).payment_status ?? '').trim().toUpperCase()
    : null;

  if (!paymentStatus || !VALID_PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUS)[number])) {
    return NextResponse.json(
      { error: 'Invalid payment_status. Must be one of: NOT_PAID, PAID, CANCELLED, ERROR' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, payment_method, payment_status, order_status')
    .eq('order_id', order_id.trim())
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const paymentMethod = (existing.payment_method ?? 'BANK_TRANSFER').toUpperCase();
  if (paymentMethod === 'STRIPE' && paymentStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Stripe orders are updated automatically via webhook. Use mark-paid only for manual payments.' },
      { status: 400 }
    );
  }

  const previousStatus = existing.payment_status ?? 'NOT_PAID';

  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  // When marking PAID, move order along pipeline (NEW -> PROCESSING) if still at NEW
  if (paymentStatus === 'PAID' && previousStatus !== 'PAID') {
    updatePayload.paid_at = new Date().toISOString();
    const currentOrderStatus = (existing.order_status ?? 'NEW').toUpperCase();
    if (currentOrderStatus === 'NEW') {
      updatePayload.order_status = 'PROCESSING';
    }
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('order_id', order_id.trim())
    .select()
    .single();

  if (error) {
    console.error('[admin] payment-status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (paymentStatus === 'PAID' && previousStatus !== 'PAID') {
    await supabase.from('order_status_history').insert({
      order_id: order_id.trim(),
      from_status: existing.payment_status ?? 'NOT_PAID',
      to_status: 'PAID',
      created_at: new Date().toISOString(),
    });
  }

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'STATUS_UPDATE', order_id.trim(), {
    payment_from: previousStatus,
    payment_to: paymentStatus,
  });

  // GA4 purchase: send only when transitioning to PAID (backend Measurement Protocol, atomic claim)
  if (paymentStatus === 'PAID' && previousStatus !== 'PAID') {
    const { sendPurchaseForOrder } = await import('@/lib/ga4/sendPurchaseForOrder');
    const ga4Result = await sendPurchaseForOrder(order_id.trim(), 'admin_payment_status');
    if (ga4Result.sent) {
      console.log('[admin/payment-status] GA4 purchase sent for order', order_id.trim());
    } else if (ga4Result.reason === 'already_sent') {
      console.log('[admin/payment-status] GA4 purchase skipped (already sent) for order', order_id.trim());
    } else if (ga4Result.reason === 'send_failed') {
      console.warn('[admin/payment-status] GA4 purchase send failed for order', order_id.trim(), ga4Result.error);
    }
  }

  return NextResponse.json({ ok: true, order: updated });
}
