import Link from 'next/link';
import { getOrderByOrderId } from '@/lib/supabase/adminQueries';
import { OrderSummaryCard } from '@/app/admin-v2/components/OrderSummaryCard';
import { ItemsList } from '@/app/admin-v2/components/ItemsList';
import { clearAdminSecret } from '@/app/admin-v2/actions';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ order_id: string }>;
}

export default async function AdminV2OrderDetailPage({ params }: PageProps) {
  const { order_id } = await params;
  const { order, items, statusHistory, error } = await getOrderByOrderId(order_id);

  if (error) {
    return (
      <div className="admin-v2-detail">
        <header className="admin-v2-header">
          <Link href="/admin-v2/orders" className="admin-v2-link">← Back to orders</Link>
        </header>
        <div className="admin-v2-error">
          <p><strong>Error loading order</strong></p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  return (
    <div className="admin-v2-detail">
      <header className="admin-v2-header">
        <div>
          <Link href="/admin-v2/orders" className="admin-v2-link">← Back to orders</Link>
          <h1 className="admin-v2-title">{order.order_id}</h1>
        </div>
        <div className="admin-v2-header-actions">
          <Link href={`/order/${order.order_id}`} target="_blank" rel="noopener noreferrer" className="admin-v2-link">
            View public page
          </Link>
          <form action={clearAdminSecret}>
            <button type="submit" className="admin-v2-btn admin-v2-btn-outline">
              Log out
            </button>
          </form>
        </div>
      </header>

      <OrderSummaryCard order={order} />
      <ItemsList items={items} />
      {(order.address || order.delivery_google_maps_url) && (
        <section className="admin-v2-section">
          <h2 className="admin-v2-section-title">Delivery</h2>
          <p><strong>Date:</strong> {order.delivery_date ?? '—'}</p>
          <p><strong>Window:</strong> {order.delivery_window ?? '—'}</p>
          <p><strong>Address:</strong> {order.address ?? '—'}</p>
          {order.delivery_google_maps_url && (
            <p>
              <a href={order.delivery_google_maps_url} target="_blank" rel="noopener noreferrer" className="admin-v2-link">
                Open in Google Maps
              </a>
            </p>
          )}
        </section>
      )}
      {(order.recipient_name || order.recipient_phone) && (
        <section className="admin-v2-section">
          <h2 className="admin-v2-section-title">Recipient</h2>
          <p><strong>Name:</strong> {order.recipient_name ?? '—'}</p>
          <p><strong>Phone:</strong> {order.recipient_phone ?? '—'}</p>
        </section>
      )}
      {(order.driver_name || order.driver_phone) && (
        <section className="admin-v2-section">
          <h2 className="admin-v2-section-title">Driver (internal)</h2>
          <p><strong>Name:</strong> {order.driver_name ?? '—'}</p>
          <p><strong>Phone:</strong> {order.driver_phone ?? '—'}</p>
        </section>
      )}
      {order.internal_notes && (
        <section className="admin-v2-section">
          <h2 className="admin-v2-section-title">Notes</h2>
          <p>{order.internal_notes}</p>
        </section>
      )}
      {statusHistory.length > 0 && (
        <section className="admin-v2-section">
          <h2 className="admin-v2-section-title">Status history</h2>
          <ul className="admin-v2-timeline">
            {statusHistory.map((h, i) => (
              <li key={i}>
                <span className="admin-v2-timeline-status">
                  {h.from_status ?? '—'} → {h.to_status ?? '—'}
                </span>
                <span className="admin-v2-timeline-date">
                  {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
