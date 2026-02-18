import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

const VALID_ORDER_STATUSES = [
  'NEW',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
  'REFUNDED',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;
  const role = (session.user as { role?: string }).role;

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

  const orderStatus = typeof body === 'object' && body !== null && 'order_status' in body
    ? String((body as { order_status?: unknown }).order_status ?? '').trim()
    : null;

  if (!orderStatus || !VALID_ORDER_STATUSES.includes(orderStatus)) {
    return NextResponse.json(
      { error: 'Invalid order_status. Must be one of: ' + VALID_ORDER_STATUSES.join(', ') },
      { status: 400 }
    );
  }

  if (orderStatus === 'REFUNDED' && role !== 'OWNER') {
    return NextResponse.json({ error: 'Only OWNER can set REFUNDED' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, order_status')
    .eq('order_id', order_id.trim())
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const previousStatus = existing.order_status ?? 'NEW';

  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      order_status: orderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', order_id.trim())
    .select()
    .single();

  if (error) {
    console.error('[admin] status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('order_status_history').insert({
    order_id: order_id.trim(),
    from_status: previousStatus,
    to_status: orderStatus,
    created_at: new Date().toISOString(),
  });

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'STATUS_UPDATE', order_id.trim(), {
    from: previousStatus,
    to: orderStatus,
  });

  return NextResponse.json({ ok: true, order: updated });
}
