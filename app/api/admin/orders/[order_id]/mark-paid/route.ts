import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

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
    .select('order_id, payment_method, payment_status, order_status')
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

  const previousPaymentStatus = existing.payment_status ?? 'PENDING';
  const previousOrderStatus = existing.order_status ?? 'NEW';

  if (previousPaymentStatus === 'PAID') {
    return NextResponse.json({ ok: true, order: existing, message: 'Already paid (idempotent)' });
  }

  const newOrderStatus = previousOrderStatus === 'NEW' ? 'PAID' : previousOrderStatus;

  const updatePayload: Record<string, unknown> = {
    payment_status: 'PAID',
    order_status: newOrderStatus,
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

  if (newOrderStatus !== previousOrderStatus) {
    await supabase.from('order_status_history').insert({
      order_id: order_id.trim(),
      from_status: previousOrderStatus,
      to_status: newOrderStatus,
      created_at: new Date().toISOString(),
    });
  }

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'MANUAL_MARK_PAID', order_id.trim(), {
    payment_status: { from: previousPaymentStatus, to: 'PAID' },
    order_status: { from: previousOrderStatus, to: newOrderStatus },
  });

  return NextResponse.json({ ok: true, order: updated });
}
