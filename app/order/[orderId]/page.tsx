import { unstable_noStore } from 'next/cache';
import { notFound } from 'next/navigation';
import { getOrderByIdWithPublicToken, getOrderDetailsUrl, getBaseUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { normalizeOrderStatus, orderStatusToFulfillmentDisplay } from '@/lib/orders/statusConstants';
import { OrderPageClient } from '@/components/order/OrderPageClient';
import { translations, defaultLocale } from '@/lib/i18n';
import { OrderNotFoundBlock } from './OrderNotFoundBlock';
import { OrderDeliveredBlock } from './OrderDeliveredBlock';

/** Always fetch fresh data; never cache. Status comes from Supabase (admin updates). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Determine if payment has been confirmed for this order.
 * Returns true only when payment is verified as PAID — via Supabase status,
 * legacy order status, or the presence of a paidAt timestamp.
 */
function isPaymentConfirmed(
  supabasePaymentStatus: string | null | undefined,
  orderStatus: string | null | undefined,
  paidAt: string | null | undefined,
): boolean {
  if ((supabasePaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  if (orderStatus === 'paid') return true;
  if (paidAt) return true;
  return false;
}

export default async function OrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  unstable_noStore();
  const { orderId } = await params;
  const normalized = orderId?.trim() ?? '';
  const sp = (await searchParams) ?? {};
  const tokenRaw = sp?.token;
  const token =
    typeof tokenRaw === 'string' ? tokenRaw.trim() : Array.isArray(tokenRaw) ? tokenRaw[0]?.trim() : '';
  if (!token) notFound();

  const order = await getOrderByIdWithPublicToken(normalized, token);
  const t = translations[defaultLocale].orderPage;

  if (!order) notFound();

  const detailsUrl = getOrderDetailsUrl(order.orderId, { token });
  const baseUrl = getBaseUrl();

  const supabasePayment = await getSupabasePaymentStatusByOrderId(order.orderId);
  const paid = isPaymentConfirmed(
    supabasePayment?.payment_status,
    order.status,
    supabasePayment?.paid_at ?? order.paidAt,
  );
  // Derive fulfillment / order status for customer view (badge on \"Order details\" tab).
  const fulfillmentFromOrderStatus =
    supabasePayment?.order_status != null
      ? orderStatusToFulfillmentDisplay(supabasePayment.order_status)
      : null;

  const fulfillmentFromLegacyColumn = supabasePayment?.fulfillment_status
    ? orderStatusToFulfillmentDisplay(supabasePayment.fulfillment_status)
    : null;

  // For customer-facing UI, prefer Supabase order_status when present; otherwise the order
  // row from getOrderById (covers a failed second query or legacy fulfillment_status-only rows).
  const fulfillmentStatus =
    fulfillmentFromOrderStatus
    ?? order.fulfillmentStatus
    ?? fulfillmentFromLegacyColumn
    ?? 'new';
  const driverAssignmentStatus =
    supabasePayment?.driver_name?.trim() || supabasePayment?.driver_phone?.trim()
      ? 'assigned'
      : 'not_assigned';
  const fulfillmentStatusUpdatedAt =
    supabasePayment?.fulfillment_status_updated_at
    ?? supabasePayment?.updated_at
    ?? order.fulfillmentStatusUpdatedAt;

  // Delivered must match the resolved badge — not only supabasePayment.order_status,
  // which can be null if the second query fails while getOrderById still has DELIVERED.
  const isDelivered =
    fulfillmentStatus === 'delivered' ||
    normalizeOrderStatus(supabasePayment?.order_status) === 'DELIVERED';

  if (isDelivered) {
    const deliveredStatusTimestamps = {
      order_received: order.createdAt ?? null,
      payment_confirmed: supabasePayment?.paid_at ?? order.paidAt ?? null,
      order_accepted: null,
      preparing: null,
      ready_for_delivery: null,
      out_for_delivery: null,
      delivered: fulfillmentStatusUpdatedAt ?? null,
    };

    return (
      <div className="order-page">
        <div className="container">
          <OrderDeliveredBlock
            orderId={order.orderId}
            t={t}
            locale={defaultLocale}
            statusTimestamps={deliveredStatusTimestamps}
            driverAssignmentStatus={driverAssignmentStatus}
          />
        </div>
      </div>
    );
  }

  /** Website checkout is Stripe-only; unpaid here means not yet paid or legacy unpaid rows. */
  const paymentStatusUpper = (supabasePayment?.payment_status ?? 'NOT_PAID').toUpperCase();
  const canPay =
    !paid && paymentStatusUpper !== 'CANCELLED' && paymentStatusUpper !== 'ERROR';

  return (
    <div className="order-page">
      <div className="container">
        <OrderPageClient
          order={order}
          orderId={order.orderId}
          detailsUrl={detailsUrl}
          baseUrl={baseUrl}
          paid={paid}
          canPay={canPay}
          fulfillmentStatus={fulfillmentStatus}
          fulfillmentStatusUpdatedAt={fulfillmentStatusUpdatedAt ?? undefined}
          supabasePaymentMethod={supabasePayment?.payment_method ?? undefined}
          supabasePaidAt={supabasePayment?.paid_at ?? order.paidAt ?? undefined}
          driverAssignmentStatus={driverAssignmentStatus}
          locale={defaultLocale}
        />
      </div>
    </div>
  );
}
