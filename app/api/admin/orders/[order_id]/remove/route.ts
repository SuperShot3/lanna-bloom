import { NextResponse } from 'next/server';
import { deleteOrder } from '@/lib/orders';
import { deleteSupabaseOrder } from '@/lib/supabase/orderAdapter';
import { requireRole } from '@/lib/adminRbac';
import { logAudit } from '@/lib/auditLog';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ order_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { order_id } = await params;
  if (!order_id?.trim()) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }

  const removed = await deleteOrder(order_id.trim());
  if (!removed) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  await deleteSupabaseOrder(order_id.trim());

  const adminEmail = session.user.email ?? 'unknown';
  await logAudit(adminEmail, 'ORDER_REMOVED', order_id.trim(), {});

  return NextResponse.json({ ok: true, message: 'Order removed' });
}
