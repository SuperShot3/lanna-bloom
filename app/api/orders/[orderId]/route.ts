import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';

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

  // Overlay Supabase fulfillment status so customer page reflects admin dashboard updates.
  // Admin updates fulfillment_status in Supabase; getOrderById may return blob/legacy data.
  const supabasePayment = await getSupabasePaymentStatusByOrderId(orderId);
  const response = {
    ...order,
    fulfillmentStatus:
      supabasePayment?.fulfillment_status ?? order.fulfillmentStatus ?? 'new',
    fulfillmentStatusUpdatedAt:
      supabasePayment?.fulfillment_status_updated_at ??
      order.fulfillmentStatusUpdatedAt,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
