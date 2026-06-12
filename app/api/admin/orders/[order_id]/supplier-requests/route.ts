import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getOrderByOrderId } from '@/lib/supabase/adminQueries';
import {
  buildSupplierRequestUrl,
  buildSupplierSnapshots,
  findSupplierShop,
  generateSupplierPublicToken,
  SUPPLIER_ACTIVE_STATUSES,
} from '@/lib/supplierRequests';
import {
  buildSupplierCatalogSnapshots,
  resolveSupplierOrderItems,
} from '@/lib/admin/supplierRequestSnapshots';

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

async function expireStaleActiveRequests(supabase: ReturnType<typeof getSupabaseAdmin>, orderId: string) {
  if (!supabase) return;
  const nowIso = new Date().toISOString();
  await supabase
    .from('supplier_order_requests')
    .update({ status: 'EXPIRED' })
    .eq('order_id', orderId)
    .in('status', SUPPLIER_ACTIVE_STATUSES)
    .lte('expires_at', nowIso);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) {
    return jsonNoStore({ error: 'order_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const shopId =
    body && typeof body === 'object' && 'shop_id' in body
      ? String((body as { shop_id?: unknown }).shop_id ?? '').trim()
      : '';
  const shop = findSupplierShop(shopId);
  if (!shop) {
    return jsonNoStore({ error: 'Invalid shop_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonNoStore({ error: 'Supabase not configured' }, { status: 503 });
  }

  await expireStaleActiveRequests(supabase, orderId);

  const { data: activeRequest, error: activeError } = await supabase
    .from('supplier_order_requests')
    .select('id, shop_name_snapshot, status')
    .eq('order_id', orderId)
    .in('status', SUPPLIER_ACTIVE_STATUSES)
    .limit(1)
    .maybeSingle();

  if (activeError) {
    return jsonNoStore({ error: activeError.message }, { status: 500 });
  }
  if (activeRequest) {
    return jsonNoStore(
      {
        error: `Active supplier request already exists for ${activeRequest.shop_name_snapshot}`,
      },
      { status: 409 }
    );
  }

  const { order, items, error } = await getOrderByOrderId(orderId);
  if (error) {
    return jsonNoStore({ error }, { status: 500 });
  }
  if (!order) {
    return jsonNoStore({ error: 'Order not found' }, { status: 404 });
  }

  const supplierItems = resolveSupplierOrderItems(order, items);
  const catalogSnapshots = await buildSupplierCatalogSnapshots(supplierItems);
  const snapshots = buildSupplierSnapshots(order, supplierItems, catalogSnapshots);
  const token = generateSupplierPublicToken();
  const adminEmail = session.user.email ?? 'unknown';
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: created, error: insertError } = await supabase
    .from('supplier_order_requests')
    .insert({
      order_id: orderId,
      shop_id: shop.id,
      shop_name_snapshot: shop.name,
      public_token: token,
      status: 'LINK_CREATED',
      product_snapshot: snapshots.product_snapshot,
      preparation_snapshot: snapshots.preparation_snapshot,
      pickup_snapshot: snapshots.pickup_snapshot,
      message_card_snapshot: snapshots.message_card_snapshot,
      expires_at: expiresAt,
      created_by_admin_id: adminEmail,
    })
    .select('*')
    .single();

  if (insertError || !created) {
    const message = insertError?.message ?? 'Failed to create supplier request';
    const status = message.includes('idx_supplier_order_requests_one_active_per_order') ? 409 : 500;
    return jsonNoStore({ error: message }, { status });
  }

  await supabase.from('supplier_order_request_events').insert({
    request_id: created.id,
    order_id: orderId,
    event_type: 'LINK_CREATED',
    event_message: `Created supplier link for ${shop.name}`,
    created_by: adminEmail,
  });

  await logAudit(adminEmail, 'SUPPLIER_REQUEST_CREATE', orderId, {
    request_id: created.id,
    shop_id: shop.id,
    shop_name: shop.name,
  });

  return jsonNoStore({
    ok: true,
    request: created,
    url: buildSupplierRequestUrl(token),
  });
}
