import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';
import { parseDeliveryDetailsPatch } from '@/lib/orders/deliveryFields';
import { updateOrderDeliveryDetails } from '@/lib/orders/supabaseStore';

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

  const parsed = parseDeliveryDetailsPatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updateOrderDeliveryDetails(orderId, parsed.patch);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logAudit(session.user.email ?? 'unknown', 'DELIVERY_DETAILS_UPDATE', orderId, {
    from: result.from,
    to: result.to,
    changedFields: result.changedFields,
  });

  return NextResponse.json({
    ok: true,
    order: result.order,
    from: result.from,
    to: result.to,
    changedFields: result.changedFields,
  });
}
