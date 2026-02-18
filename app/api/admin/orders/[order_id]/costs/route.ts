import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

/** Returns { value, invalid }. invalid=true means reject the request. */
function parseCost(value: unknown): { value: number | null; invalid: boolean } {
  if (value == null) return { value: null, invalid: false };
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value < 0) return { value: null, invalid: true };
    return { value: Math.round(value * 100) / 100, invalid: false };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return { value: null, invalid: false };
    const n = parseFloat(trimmed);
    if (Number.isNaN(n) || n < 0) return { value: null, invalid: true };
    return { value: Math.round(n * 100) / 100, invalid: false };
  }
  return { value: null, invalid: true };
}

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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const hasCogs = 'cogs_amount' in b;
  const hasDelivery = 'delivery_cost' in b;
  const hasPayment = 'payment_fee' in b;

  if (!hasCogs && !hasDelivery && !hasPayment) {
    return NextResponse.json(
      { error: 'At least one of cogs_amount, delivery_cost, payment_fee must be provided' },
      { status: 400 }
    );
  }

  const cogsResult = hasCogs ? parseCost(b.cogs_amount) : null;
  const deliveryResult = hasDelivery ? parseCost(b.delivery_cost) : null;
  const paymentResult = hasPayment ? parseCost(b.payment_fee) : null;

  if (cogsResult?.invalid || deliveryResult?.invalid || paymentResult?.invalid) {
    return NextResponse.json(
      { error: 'Invalid value: only numeric values >= 0 allowed (max 2 decimal places)' },
      { status: 400 }
    );
  }

  const cogs_amount = cogsResult?.value;
  const delivery_cost = deliveryResult?.value;
  const payment_fee = paymentResult?.value;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 503 }
    );
  }

  const updatePayload: Record<string, number | null> = {};
  if (hasCogs) updatePayload.cogs_amount = cogs_amount ?? null;
  if (hasDelivery) updatePayload.delivery_cost = delivery_cost ?? null;
  if (hasPayment) updatePayload.payment_fee = payment_fee ?? null;

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id.trim())
      .select()
      .single();

    if (error) {
      console.error('[admin-v2] costs update error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const adminEmail = session.user.email ?? 'unknown';
    await logAudit(adminEmail, 'COSTS_UPDATE', order_id.trim(), {
      before: {},
      after: updatePayload,
    });

    return NextResponse.json({ ok: true, order: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin-v2] costs update exception:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
