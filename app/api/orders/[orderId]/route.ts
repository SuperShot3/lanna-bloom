import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import {
  getSupabaseOrderStatusHistoryByOrderId,
  getSupabasePaymentStatusByOrderId,
} from '@/lib/supabase/adminQueries';
import { normalizeOrderStatus, orderStatusToFulfillmentDisplay } from '@/lib/orders/statusConstants';
import {
  buildOrderLifecycleTimestamps,
  getCurrentOrderLifecycleStatus,
  getLifecycleTimestampForStatus,
} from '@/lib/orders/lifecycle';

export const dynamic = 'force-dynamic';

function normalizeOrderToken(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const normalized = orderId?.trim();
  if (!normalized) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }
  const tokenFromQuery = request.nextUrl.searchParams.get('token');
  const tokenFromHeader = request.headers.get('x-order-token');
  const orderToken = normalizeOrderToken(tokenFromQuery ?? tokenFromHeader);

  if (!orderToken) {
    return NextResponse.json(
      { error: 'Order not found' },
      {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const order = await getOrderByIdWithPublicToken(normalized, orderToken);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const [supabasePayment, statusHistory] = await Promise.all([
    getSupabasePaymentStatusByOrderId(normalized),
    getSupabaseOrderStatusHistoryByOrderId(normalized),
  ]);
  if (!supabasePayment) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

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
  const paid =
    (supabasePayment?.payment_status ?? '').toUpperCase() === 'PAID' ||
    order.status === 'paid' ||
    Boolean(supabasePayment?.paid_at ?? order.paidAt);
  const statusUpdatedAtFallback =
    supabasePayment?.updated_at ??
    supabasePayment?.fulfillment_status_updated_at ??
    order.fulfillmentStatusUpdatedAt;
  const lifecycleCurrentStatus = getCurrentOrderLifecycleStatus(fulfillmentStatus, paid);
  const statusTimestamps = buildOrderLifecycleTimestamps({
    orderCreatedAt: order.createdAt,
    paidAt: supabasePayment?.paid_at ?? order.paidAt,
    statusHistory,
    fulfillmentStatus: orderStatus ?? fulfillmentStatus,
    currentStatus: lifecycleCurrentStatus,
    fallbackUpdatedAt: statusUpdatedAtFallback,
  });
  const fulfillmentStatusUpdatedAt =
    getLifecycleTimestampForStatus(statusTimestamps, lifecycleCurrentStatus) ??
    statusUpdatedAtFallback;

  const isDelivered =
    fulfillmentStatus === 'delivered' ||
    normalizeOrderStatus(supabasePayment?.order_status) === 'DELIVERED';

  if (isDelivered) {
    return NextResponse.json(
      {
        orderId: order.orderId,
        order_status: orderStatus,
        fulfillmentStatus: 'delivered',
        fulfillmentStatusUpdatedAt,
        statusTimestamps,
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
    fulfillmentStatusUpdatedAt,
    statusTimestamps,
    payment_status: supabasePayment?.payment_status ?? order.status,
    payment_method: supabasePayment?.payment_method,
    paid_at: supabasePayment?.paid_at ?? order.paidAt,
  };

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
