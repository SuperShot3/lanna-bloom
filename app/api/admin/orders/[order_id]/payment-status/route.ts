import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];

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

  if (!paymentStatus || !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    return NextResponse.json(
      { error: 'Invalid payment_status. Must be one of: PENDING, PAID, FAILED' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, payment_status')
    .eq('order_id', order_id.trim())
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const previousStatus = existing.payment_status ?? 'PENDING';

  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  if (paymentStatus === 'PAID' && previousStatus !== 'PAID') {
    updatePayload.paid_at = new Date().toISOString();
    updatePayload.order_status = 'PAID';
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
      from_status: existing.payment_status ?? 'PENDING',
      to_status: 'PAID',
      created_at: new Date().toISOString(),
    });
  }

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'STATUS_UPDATE', order_id.trim(), {
    payment_from: previousStatus,
    payment_to: paymentStatus,
  });

  return NextResponse.json({ ok: true, order: updated });
}
