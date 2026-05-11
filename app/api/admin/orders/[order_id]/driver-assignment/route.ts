import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { getSupabaseAdmin } from '@/lib/supabase/server';

function parseDriverName(body: unknown): string | null | undefined {
  if (typeof body !== 'object' || body === null || !('driver_name' in body)) {
    return undefined;
  }

  const raw = (body as { driver_name?: unknown }).driver_name;
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed || null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const driverName = parseDriverName(body);
  if (driverName === undefined) {
    return NextResponse.json({ error: 'driver_name must be a string or null' }, { status: 400 });
  }
  if (driverName && driverName.length > 80) {
    return NextResponse.json({ error: 'driver_name must be 80 characters or fewer' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('order_id, driver_name, driver_phone')
    .eq('order_id', orderId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      driver_name: driverName,
      driver_phone: null,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .select('order_id, driver_name, driver_phone')
    .single();

  if (error) {
    console.error('[admin] driver assignment update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(session.user.email ?? 'unknown', 'DRIVER_ASSIGN', orderId, {
    from: {
      driver_name: existing.driver_name ?? null,
      driver_phone: existing.driver_phone ?? null,
    },
    to: {
      driver_name: driverName,
      driver_phone: null,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
