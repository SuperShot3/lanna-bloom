import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  isActiveSupplierRequestStatus,
  isSupplierRequestExpired,
  type SupplierResponseType,
} from '@/lib/supplierRequests';

const RESPONSE_TO_STATUS: Record<SupplierResponseType, string> = {
  PREPARE: 'ACCEPTED',
  PREPARE_WITH_CHANGES: 'ACCEPTED_WITH_CHANGES',
  DECLINE: 'DECLINED',
};

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(body, { ...init, headers });
}

function parseResponseType(value: unknown): SupplierResponseType | null {
  if (value === 'PREPARE' || value === 'PREPARE_WITH_CHANGES' || value === 'DECLINE') {
    return value;
  }
  return null;
}

function parsePrice(value: unknown): { value: number | null; ok: boolean } {
  if (value == null || value === '') return { value: null, ok: true };
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) return { value: null, ok: false };
  return { value: Math.round(n * 100) / 100, ok: true };
}

function trimText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const publicToken = token?.trim();
  if (!publicToken) {
    return jsonNoStore({ error: 'คำขอนี้ไม่พร้อมใช้งานแล้ว กรุณาติดต่อผู้ประสานงาน' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' }, { status: 400 });
  }

  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const responseType = parseResponseType(b.response_type);
  if (!responseType) {
    return jsonNoStore({ error: 'กรุณาเลือกคำตอบ' }, { status: 400 });
  }

  const price = parsePrice(b.supplier_price);
  if (!price.ok) {
    return jsonNoStore({ error: 'กรุณาระบุราคาเป็นตัวเลขที่ถูกต้อง' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return jsonNoStore({ error: 'ระบบยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ประสานงาน' }, { status: 503 });
  }

  const { data: requestRow, error } = await supabase
    .from('supplier_order_requests')
    .select('id, order_id, status, expires_at, shop_name_snapshot')
    .eq('public_token', publicToken)
    .maybeSingle();

  if (error || !requestRow) {
    return jsonNoStore({ error: 'คำขอนี้ไม่พร้อมใช้งานแล้ว กรุณาติดต่อผู้ประสานงาน' }, { status: 404 });
  }

  if (isSupplierRequestExpired(requestRow.expires_at)) {
    if (isActiveSupplierRequestStatus(requestRow.status)) {
      await supabase
        .from('supplier_order_requests')
        .update({ status: 'EXPIRED' })
        .eq('id', requestRow.id);
      await supabase.from('supplier_order_request_events').insert({
        request_id: requestRow.id,
        order_id: requestRow.order_id,
        event_type: 'EXPIRED',
        event_message: 'Supplier link expired',
        created_by: 'supplier',
      });
    }
    return jsonNoStore({ error: 'คำขอนี้ไม่พร้อมใช้งานแล้ว กรุณาติดต่อผู้ประสานงาน' }, { status: 410 });
  }

  if (!isActiveSupplierRequestStatus(requestRow.status)) {
    return jsonNoStore({ error: 'คำขอนี้ไม่พร้อมใช้งานแล้ว กรุณาติดต่อผู้ประสานงาน' }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const nextStatus = RESPONSE_TO_STATUS[responseType];
  const { data: updated, error: updateError } = await supabase
    .from('supplier_order_requests')
    .update({
      status: nextStatus,
      supplier_response_type: responseType,
      supplier_price: price.value,
      supplier_ready_time: trimText(b.supplier_ready_time, 120),
      supplier_reason: trimText(b.supplier_reason, 1000),
      supplier_notes: trimText(b.supplier_notes, 1000),
      responded_at: nowIso,
    })
    .eq('id', requestRow.id)
    .in('status', ['LINK_CREATED', 'LINK_SENT', 'LINK_OPENED', 'WAITING_RESPONSE'])
    .select('id')
    .single();

  if (updateError || !updated) {
    return jsonNoStore({ error: 'ส่งคำตอบไม่สำเร็จ กรุณาติดต่อผู้ประสานงาน' }, { status: 500 });
  }

  await supabase.from('supplier_order_request_events').insert({
    request_id: requestRow.id,
    order_id: requestRow.order_id,
    event_type: nextStatus,
    event_message:
      responseType === 'DECLINE'
        ? `${requestRow.shop_name_snapshot} declined the request`
        : `${requestRow.shop_name_snapshot} submitted an acceptance response`,
    created_by: 'supplier',
  });

  return jsonNoStore({ ok: true });
}
