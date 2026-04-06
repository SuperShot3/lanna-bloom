import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { normalizeOrderStatus, orderStatusToFulfillmentDisplay } from '@/lib/orders/statusConstants';

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

  const supabasePayment = await getSupabasePaymentStatusByOrderId(normalized);
  const orderStatus = supabasePayment?.order_status ?? null;
  const fulfillmentFromOrderStatus =
    orderStatus != null ? orderStatusToFulfillmentDisplay(orderStatus) : null;
  const fulfillmentFromLegacyColumn = supabasePayment?.fulfillment_status
    ? orderStatusToFulfillmentDisplay(supabasePayment.fulfillment_status)
    : null;
  const fulfillmentStatus =
    fulfillmentFromOrderStatus
    ?? order.fulfillmentStatus
    ?? fulfillmentFromLegacyColumn
    ?? 'new';

  const isDelivered =
    fulfillmentStatus === 'delivered' ||
    normalizeOrderStatus(supabasePayment?.order_status) === 'DELIVERED';

  if (isDelivered) {
    const fulfillmentStatusUpdatedAt =
      supabasePayment?.fulfillment_status_updated_at
      ?? supabasePayment?.updated_at
      ?? order.fulfillmentStatusUpdatedAt;
    return NextResponse.json(
      {
        orderId: order.orderId,
        order_status: orderStatus,
        fulfillmentStatus: 'delivered',
        fulfillmentStatusUpdatedAt,
        payment_status: supabasePayment?.payment_status ?? order.status,
        payment_method: supabasePayment?.payment_method,
        paid_at: supabasePayment?.paid_at ?? order.paidAt,
        deliveredPublicClosed: true,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const response = {
    ...order,
    order_status: orderStatus,
    fulfillmentStatus,
    fulfillmentStatusUpdatedAt:
      supabasePayment?.fulfillment_status_updated_at ??
      supabasePayment?.updated_at ??
      order.fulfillmentStatusUpdatedAt,
    payment_status: supabasePayment?.payment_status ?? order.status,
    payment_method: supabasePayment?.payment_method,
    paid_at: supabasePayment?.paid_at ?? order.paidAt,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
