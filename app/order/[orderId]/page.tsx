import { notFound } from 'next/navigation';
import { getOrderById, getOrderDetailsUrl } from '@/lib/orders';
import { OrderDetailsView } from '@/components/OrderDetailsView';
import { translations, defaultLocale } from '@/lib/i18n';

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderById(orderId);
  if (!order) {
    notFound();
  }
  const detailsUrl = getOrderDetailsUrl(order.orderId);
  const t = translations[defaultLocale].orderPage;
  return (
    <div className="order-page">
      <div className="container">
        <h1 className="order-page-title">{t.orderDetails}</h1>
        <OrderDetailsView
          order={order}
          detailsUrl={detailsUrl}
          copyOrderIdLabel={t.copyOrderId}
          copyLinkLabel={t.copyLink}
          copiedLabel={t.copied}
        />
      </div>
    </div>
  );
}
