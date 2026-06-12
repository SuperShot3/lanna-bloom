import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { buildSupplierRequestUrl } from '@/lib/supplierRequests';

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(
  request: NextRequest,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const eventType =
    body && typeof body === 'object' && 'event_type' in body
      ? String((body as { event_type?: unknown }).event_type ?? '').trim()
      : 'LINK_COPIED';
  if (eventType !== 'LINK_COPIED') {
    return jsonNoStore({ error: 'Unsupported event_type' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonNoStore({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: requestRow, error } = await supabase
    .from('supplier_order_requests')
    .select('id, order_id, shop_name_snapshot, public_token, status')
    .eq('id', requestId)
    .eq('order_id', orderId)
    .single();

  if (error || !requestRow) {
    return jsonNoStore({ error: 'Supplier request not found' }, { status: 404 });
  }

  if (requestRow.status === 'LINK_CREATED') {
    await supabase
      .from('supplier_order_requests')
      .update({ status: 'LINK_SENT' })
      .eq('id', requestId)
      .eq('status', 'LINK_CREATED');
  }

  const adminEmail = session.user.email ?? 'unknown';
  await supabase.from('supplier_order_request_events').insert({
    request_id: requestId,
    order_id: orderId,
    event_type: 'LINK_COPIED',
    event_message: `Copied supplier link for ${requestRow.shop_name_snapshot}`,
    created_by: adminEmail,
  });

  return jsonNoStore({
    ok: true,
    url: buildSupplierRequestUrl(requestRow.public_token),
  });
}
