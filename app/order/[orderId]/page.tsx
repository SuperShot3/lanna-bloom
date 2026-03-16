import { unstable_noStore } from 'next/cache';
import { getOrderById, getOrderDetailsUrl, getBaseUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { orderStatusToFulfillmentDisplay } from '@/lib/orders/statusConstants';
import { OrderPageClient } from '@/components/order/OrderPageClient';
import { OrderPaidConversionTracker } from '@/components/OrderPaidConversionTracker';
import { translations, defaultLocale } from '@/lib/i18n';
import { OrderNotFoundBlock } from './OrderNotFoundBlock';

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
}: {
  params: Promise<{ orderId: string }>;
}) {
  unstable_noStore();
  const { orderId } = await params;
  const normalized = orderId?.trim() ?? '';
  const order = await getOrderById(normalized);
  const t = translations[defaultLocale].orderPage;

  if (!order) {
    return (
      <div className="order-page">
        <div className="container">
          <OrderNotFoundBlock orderId={normalized || orderId} t={t} locale={defaultLocale} />
        </div>
      </div>
    );
  }

  const detailsUrl = getOrderDetailsUrl(order.orderId);
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

  // For customer-facing UI, always treat Supabase order_status as source of truth.
  // fulfillment_status is legacy and may remain "new" even after admin updates order_status.
  const fulfillmentStatus =
    fulfillmentFromOrderStatus
    ?? order.fulfillmentStatus
    ?? supabasePayment?.fulfillment_status
    ?? 'new';
  const fulfillmentStatusUpdatedAt =
    supabasePayment?.fulfillment_status_updated_at
    ?? supabasePayment?.updated_at
    ?? order.fulfillmentStatusUpdatedAt;

  // Gate public \"Make payment\" UI: default payment status is NOT_PAID (not ready for payment).
  // Admin must explicitly set payment_status to READY_TO_PAY in the dashboard.
  const paymentStatusUpper = (supabasePayment?.payment_status ?? 'NOT_PAID').toUpperCase();
  const canPay = !paid && paymentStatusUpper === 'READY_TO_PAY';

  const conversionValue = order.pricing?.grandTotal ?? order.amountTotal ?? 0;
  const conversionCurrency = order.currency ?? 'THB';
  const purchaseItems = (order.items ?? []).map((it, i) => ({
    item_id: it.bouquetId,
    item_name: it.bouquetTitle,
    price: it.price,
    quantity: 1,
    index: i,
    item_variant: it.size || undefined,
  }));

  return (
    <div className="order-page">
      {paid && (
        <OrderPaidConversionTracker
          orderId={order.orderId}
          value={conversionValue}
          currency={conversionCurrency}
          items={purchaseItems}
        />
      )}
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
          locale={defaultLocale}
        />
      </div>
    </div>
  );
}
