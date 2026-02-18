import Link from 'next/link';
import { getOrderById, getOrderDetailsUrl, getBaseUrl } from '@/lib/orders';
import { getSupabasePaymentStatusByOrderId } from '@/lib/supabase/adminQueries';
import { OrderDetailsView } from '@/components/OrderDetailsView';
import { translations, defaultLocale } from '@/lib/i18n';
import { OrderNotFoundBlock } from './OrderNotFoundBlock';

/** Always fetch from KV on each request; never cache the order page. */
export const dynamic = 'force-dynamic';

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderById(orderId);
  const t = translations[defaultLocale].orderPage;

  if (!order) {
    return (
      <div className="order-page">
        <div className="container">
          <OrderNotFoundBlock orderId={orderId} t={t} locale={defaultLocale} />
        </div>
      </div>
    );
  }

  const detailsUrl = getOrderDetailsUrl(order.orderId);
  const baseUrl = getBaseUrl();

  const supabasePayment = await getSupabasePaymentStatusByOrderId(order.orderId);

  return (
    <div className="order-page">
      <div className="container">
        <h1 className="order-page-title">{t.orderDetails}</h1>
        <OrderDetailsView
          order={order}
          detailsUrl={detailsUrl}
          baseUrl={baseUrl}
          copyOrderIdLabel={t.copyOrderId}
          copyLinkLabel={t.copyLink}
          copiedLabel={t.copied}
          locale={defaultLocale}
          supabasePaymentStatus={supabasePayment?.payment_status ?? undefined}
          supabasePaymentMethod={supabasePayment?.payment_method ?? undefined}
          supabasePaidAt={supabasePayment?.paid_at ?? undefined}
        />
      </div>
    </div>
  );
}
