import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orders';

export const dynamic = 'force-dynamic';

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
  return NextResponse.json(order, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
