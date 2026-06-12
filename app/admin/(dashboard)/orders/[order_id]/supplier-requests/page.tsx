import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import {
  getOrderByOrderId,
  getSupplierRequestEventsForOrder,
  getSupplierRequestsForOrder,
} from '@/lib/supabase/adminQueries';
import { canChangeStatus } from '@/lib/adminRbac';
import { SupplierRequestsManager } from '@/app/admin/components/SupplierRequestsManager';
import {
  buildSupplierCatalogSnapshots,
  getCustomOrderDetails,
  resolveSupplierOrderItems,
} from '@/lib/admin/supplierRequestSnapshots';
import {
  SUPPLIER_REQUEST_BASE_URL,
  buildSupplierSnapshots,
  supplierStatusLabelEnglish,
} from '@/lib/supplierRequests';
import { formatShopDateTime } from '@/lib/shopTime';

interface PageProps {
  params: Promise<{ order_id: string }>;
}

export default async function SupplierRequestsPage({ params }: PageProps) {
  const { order_id } = await params;
  const orderId = order_id?.trim();
  if (!orderId) notFound();

  const session = await auth();
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const canManage = canChangeStatus(role);

  const [{ order, items, error }, requests, events] = await Promise.all([
    getOrderByOrderId(orderId),
    getSupplierRequestsForOrder(orderId),
    getSupplierRequestEventsForOrder(orderId),
  ]);

  if (error) {
    return (
      <div className="admin-detail">
        <Link href={`/admin/orders/${encodeURIComponent(orderId)}`} className="admin-link">
          ← Back to order
        </Link>
        <div className="admin-error">
          <p><strong>Error loading order</strong></p>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  if (!order) notFound();

  const supplierItems = resolveSupplierOrderItems(order, items);
  const catalogSnapshots = await buildSupplierCatalogSnapshots(supplierItems);
  const supplierPreview = buildSupplierSnapshots(order, supplierItems, catalogSnapshots);
  const firstItem = supplierPreview.product_snapshot.items[0];
  const customOrder = getCustomOrderDetails(order);
  const adminProductNames =
    supplierPreview.product_snapshot.items.map((item) => item.title || item.displayTitle).join(', ') ||
    'Not specified';
  const adminDeliveryWhen =
    [supplierPreview.preparation_snapshot.deliveryDate, supplierPreview.preparation_snapshot.deliveryWindow]
      .filter(Boolean)
      .join(' · ') || 'Not specified';
  const adminDeliveryArea =
    [
      supplierPreview.preparation_snapshot.deliveryDestination,
      supplierPreview.preparation_snapshot.deliveryZone,
      supplierPreview.preparation_snapshot.postalCode,
      supplierPreview.preparation_snapshot.district,
    ]
      .filter(Boolean)
      .join(' · ') || 'Not specified';

  return (
    <div className="admin-detail admin-supplier-page">
      <header className="admin-header admin-page-header">
        <div>
          <Link
            href={`/admin/orders/${encodeURIComponent(order.order_id)}`}
            className="admin-link"
            style={{ display: 'inline-block', marginBottom: 8 }}
          >
            ← Back to order
          </Link>
          <h1 className="admin-title">Supplier requests · {order.order_id}</h1>
          <p className="admin-hint">Manage shop links and approve the supplier for this order.</p>
        </div>
      </header>

      <section className="admin-section admin-supplier-order-preview">
        <h2 className="admin-section-title">Supplier-Safe Preview</h2>
        <div className="admin-supplier-preview-grid">
          <div className="admin-supplier-preview-photo">
            {firstItem?.imageUrl ? (
              <img src={firstItem.imageUrl} alt={firstItem.title || firstItem.displayTitle} />
            ) : (
              <div className="admin-item-placeholder" />
            )}
          </div>
          <div>
            <p>
              <strong>Products:</strong> {adminProductNames}
            </p>
            <p>
              <strong>Delivery date/time:</strong> {adminDeliveryWhen}
            </p>
            <p>
              <strong>Area:</strong> {adminDeliveryArea}
            </p>
            {customOrder?.giftDescription && (
              <p>
                <strong>Custom order:</strong> {customOrder.giftDescription}
              </p>
            )}
            {supplierPreview.message_card_snapshot.customGreetingCard && (
              <p>
                <strong>Message card:</strong> {supplierPreview.message_card_snapshot.customGreetingCard}
              </p>
            )}
            <p className="admin-hint">
              Supplier links do not expose selling totals, customer email, margins, or unnecessary private details.
            </p>
          </div>
        </div>
      </section>

      {order.confirmed_supplier_shop_name && (
        <section className="admin-section admin-supplier-confirmed">
          <h2 className="admin-section-title">Confirmed Supplier</h2>
          <p>
            <span className="admin-badge admin-badge-paid">Confirmed</span>{' '}
            <strong>{order.confirmed_supplier_shop_name}</strong>
          </p>
          <p className="admin-muted">
            Price: {order.confirmed_supplier_price != null ? `฿${Number(order.confirmed_supplier_price).toLocaleString()}` : 'Not set'} ·
            Ready: {order.confirmed_supplier_ready_time ?? 'Not set'} ·
            Confirmed: {formatShopDateTime(order.confirmed_supplier_confirmed_at)}
          </p>
        </section>
      )}

      <SupplierRequestsManager
        orderId={order.order_id}
        initialRequests={requests}
        canManage={canManage}
        supplierBaseUrl={SUPPLIER_REQUEST_BASE_URL}
      />

      <section className="admin-section">
        <h2 className="admin-section-title">Timeline</h2>
        {events.length === 0 ? (
          <p className="admin-empty">No supplier request history yet.</p>
        ) : (
          <ul className="admin-timeline">
            {events.map((event) => {
              const request = requests.find((r) => r.id === event.request_id);
              return (
                <li key={event.id}>
                  <span className="admin-timeline-status">
                    {event.event_message}
                    {request ? ` · ${request.shop_name_snapshot} · ${supplierStatusLabelEnglish(request.status)}` : ''}
                  </span>
                  <span className="admin-timeline-date">
                    {formatShopDateTime(event.created_at)}
                    {event.created_by ? ` · ${event.created_by}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
