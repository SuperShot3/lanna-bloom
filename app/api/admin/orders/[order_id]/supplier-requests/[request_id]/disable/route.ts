import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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

  const { data: existing, error: fetchError } = await supabase
    .from('supplier_order_requests')
    .select('id, order_id, shop_name_snapshot, status')
    .eq('id', requestId)
    .eq('order_id', orderId)
    .single();

  if (fetchError || !existing) {
    return jsonNoStore({ error: 'Supplier request not found' }, { status: 404 });
  }

  if (existing.status === 'APPROVED') {
    return jsonNoStore({ error: 'Approved supplier request cannot be disabled' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('supplier_order_requests')
    .update({ status: 'DISABLED', disabled_at: nowIso })
    .eq('id', requestId)
    .eq('order_id', orderId)
    .select('*')
    .single();

  if (error || !updated) {
    return jsonNoStore({ error: error?.message ?? 'Failed to disable request' }, { status: 500 });
  }

  const adminEmail = session.user.email ?? 'unknown';
  await supabase.from('supplier_order_request_events').insert({
    request_id: requestId,
    order_id: orderId,
    event_type: 'DISABLED',
    event_message: `Disabled supplier link for ${existing.shop_name_snapshot}`,
    created_by: adminEmail,
  });
  await logAudit(adminEmail, 'SUPPLIER_REQUEST_DISABLE', orderId, {
    request_id: requestId,
    previous_status: existing.status,
  });

  return jsonNoStore({ ok: true, request: updated });
}
