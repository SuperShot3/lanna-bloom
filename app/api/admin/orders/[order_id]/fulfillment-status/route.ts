import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

const VALID_FULFILLMENT_STATUSES = [
  'new',
  'confirmed',
  'preparing',
  'dispatched',
  'delivered',
  'cancelled',
  'issue',
];

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

  const fulfillmentStatus = typeof body === 'object' && body !== null && 'fulfillment_status' in body
    ? String((body as { fulfillment_status?: unknown }).fulfillment_status ?? '').trim().toLowerCase()
    : null;
  const note = typeof body === 'object' && body !== null && 'note' in body
    ? String((body as { note?: unknown }).note ?? '').trim()
    : undefined;

  if (!fulfillmentStatus || !VALID_FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
    return NextResponse.json(
      { error: 'Invalid fulfillment_status. Must be one of: ' + VALID_FULFILLMENT_STATUSES.join(', ') },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, fulfillment_status')
    .eq('order_id', order_id.trim())
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const previousStatus = existing.fulfillment_status ?? 'new';

  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      fulfillment_status: fulfillmentStatus,
      fulfillment_status_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', order_id.trim())
    .select()
    .single();

  if (error) {
    console.error('[admin] fulfillment-status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'FULFILLMENT_STATUS_UPDATE', order_id.trim(), {
    from: previousStatus,
    to: fulfillmentStatus,
    ...(note ? { note } : {}),
  });

  return NextResponse.json({ ok: true, order: updated });
}
