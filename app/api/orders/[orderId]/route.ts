import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, deleteOrder } from '@/lib/orders';

function isAdminAuthorized(request: NextRequest): boolean {
  const secret = process.env.ORDERS_ADMIN_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === 'development';
  }
  const header = request.headers.get('x-admin-secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return header === secret;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  return NextResponse.json(order);
}

/** Remove order (e.g. after delivery). Requires admin secret in production. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  const removed = await deleteOrder(orderId);
  if (!removed) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, message: 'Order removed' });
}
