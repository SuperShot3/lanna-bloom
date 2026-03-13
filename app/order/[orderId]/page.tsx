import { getOrderById, getOrderDetailsUrl, getBaseUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { OrderDetailsView } from '@/components/OrderDetailsView';
import { OrderPendingConfirmation } from '@/components/OrderPendingConfirmation';
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

  // Always fetch latest status from Supabase (single source of truth).
  const supabasePayment = await getSupabasePaymentStatusByOrderId(order.orderId);
  const fulfillmentStatus =
    supabasePayment?.fulfillment_status ?? order.fulfillmentStatus ?? 'new';
  const fulfillmentStatusUpdatedAt =
    supabasePayment?.fulfillment_status_updated_at ?? order.fulfillmentStatusUpdatedAt;

  /*
   * INTERMEDIATE STATE: If payment is NOT confirmed, show the pending-confirmation
   * page. GA4 purchase is never fired from this app; it is sent only from the
   * backend when admin sets status to paid/confirmed_paid (Measurement Protocol).
   */
  const paid = isPaymentConfirmed(
    supabasePayment?.payment_status,
    order.status,
    supabasePayment?.paid_at ?? order.paidAt,
  );

  if (!paid) {
    return <OrderPendingConfirmation orderId={order.orderId} locale={defaultLocale} />;
  }

  return (
    <div className="order-page">
      <div className="container">
        <h1 className="order-page-title">{t.orderDetails}</h1>
        <OrderDetailsView
          order={order}
          orderId={order.orderId}
          detailsUrl={detailsUrl}
          baseUrl={baseUrl}
          copyOrderIdLabel={t.copyOrderId}
          copyLinkLabel={t.copyLink}
          copiedLabel={t.copied}
          locale={defaultLocale}
          supabasePaymentStatus={supabasePayment?.payment_status ?? undefined}
          supabasePaymentMethod={supabasePayment?.payment_method ?? undefined}
          supabasePaidAt={supabasePayment?.paid_at ?? undefined}
          fulfillmentStatus={fulfillmentStatus}
          fulfillmentStatusUpdatedAt={fulfillmentStatusUpdatedAt ?? undefined}
        />
      </div>
    </div>
  );
}
