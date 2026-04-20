import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdWithPublicToken } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { normalizeOrderStatus, orderStatusToFulfillmentDisplay } from '@/lib/orders/statusConstants';

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

  const supabasePayment = await getSupabasePaymentStatusByOrderId(normalized);
  if (!supabasePayment) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!orderToken) {
    const orderStatus = supabasePayment.order_status ?? null;
    const fulfillmentFromOrderStatus =
      orderStatus != null ? orderStatusToFulfillmentDisplay(orderStatus) : null;
    const fulfillmentFromLegacyColumn = supabasePayment.fulfillment_status
      ? orderStatusToFulfillmentDisplay(supabasePayment.fulfillment_status)
      : null;
    const fulfillmentStatus =
      fulfillmentFromOrderStatus
      ?? fulfillmentFromLegacyColumn
      ?? 'new';
    return NextResponse.json(
      {
        orderId: normalized,
        order_status: orderStatus,
        fulfillmentStatus,
        fulfillmentStatusUpdatedAt:
          supabasePayment.fulfillment_status_updated_at ??
          supabasePayment.updated_at ??
          null,
        payment_status: supabasePayment.payment_status,
        payment_method: supabasePayment.payment_method,
        paid_at: supabasePayment.paid_at,
        privacyLimited: true,
        requiresToken: true,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const order = await getOrderByIdWithPublicToken(normalized, orderToken);
  if (!order) {
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
