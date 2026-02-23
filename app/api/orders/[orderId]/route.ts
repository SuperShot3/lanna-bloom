import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const normalized = orderId?.trim();
  if (!normalized) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  const order = await getOrderById(normalized);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Always fetch latest status from Supabase (single source of truth).
  // Admin updates fulfillment_status and payment_status in Supabase.
  const supabasePayment = await getSupabasePaymentStatusByOrderId(normalized);
  const response = {
    ...order,
    fulfillmentStatus:
      supabasePayment?.fulfillment_status ?? order.fulfillmentStatus ?? 'new',
    fulfillmentStatusUpdatedAt:
      supabasePayment?.fulfillment_status_updated_at ??
      order.fulfillmentStatusUpdatedAt,
    payment_status: supabasePayment?.payment_status ?? order.status,
    payment_method: supabasePayment?.payment_method,
    paid_at: supabasePayment?.paid_at ?? order.paidAt,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
