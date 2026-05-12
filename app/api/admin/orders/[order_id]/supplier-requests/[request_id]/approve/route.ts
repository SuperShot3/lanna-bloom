import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { SUPPLIER_ACTIVE_STATUSES } from '@/lib/supplierRequests';

const APPROVABLE_STATUSES = ['ACCEPTED', 'ACCEPTED_WITH_CHANGES'] as const;

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ order_id: string; request_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id, request_id } = await params;
  const orderId = order_id?.trim();
  const requestId = request_id?.trim();
  if (!orderId || !requestId) {
    return jsonNoStore({ error: 'order_id and request_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonNoStore({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: requestRow, error: fetchError } = await supabase
    .from('supplier_order_requests')
    .select('*')
    .eq('id', requestId)
    .eq('order_id', orderId)
    .single();

  if (fetchError || !requestRow) {
    return jsonNoStore({ error: 'Supplier request not found' }, { status: 404 });
  }

  if (!APPROVABLE_STATUSES.includes(requestRow.status as (typeof APPROVABLE_STATUSES)[number])) {
    return jsonNoStore(
      { error: 'Supplier request must be accepted before approval' },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      confirmed_supplier_request_id: requestId,
      confirmed_shop_id: requestRow.shop_id,
      confirmed_supplier_shop_name: requestRow.shop_name_snapshot,
      confirmed_supplier_price: requestRow.supplier_price,
      confirmed_supplier_ready_time: requestRow.supplier_ready_time,
      confirmed_supplier_confirmed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('order_id', orderId);

  if (orderError) {
    return jsonNoStore({ error: orderError.message }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('supplier_order_requests')
    .update({ status: 'APPROVED', approved_at: nowIso })
    .eq('id', requestId)
    .eq('order_id', orderId)
    .select('*')
    .single();

  if (updateError || !updated) {
    return jsonNoStore({ error: updateError?.message ?? 'Failed to approve supplier' }, { status: 500 });
  }

  await supabase
    .from('supplier_order_requests')
    .update({ status: 'DISABLED', disabled_at: nowIso })
    .eq('order_id', orderId)
    .neq('id', requestId)
    .in('status', SUPPLIER_ACTIVE_STATUSES);

  const adminEmail = session.user.email ?? 'unknown';
  await supabase.from('supplier_order_request_events').insert({
    request_id: requestId,
    order_id: orderId,
    event_type: 'APPROVED',
    event_message: `Approved supplier ${requestRow.shop_name_snapshot}`,
    created_by: adminEmail,
  });
  await logAudit(adminEmail, 'SUPPLIER_REQUEST_APPROVE', orderId, {
    request_id: requestId,
    shop_id: requestRow.shop_id,
    shop_name: requestRow.shop_name_snapshot,
    supplier_price: requestRow.supplier_price,
  });

  return jsonNoStore({ ok: true, request: updated });
}
