import Link from 'next/link';
import { auth } from '@/auth';
import { getOrderByOrderId } from '@/lib/supabase/adminQueries';
import { getBouquetById, getProductById } from '@/lib/sanity';
import { OrderSummaryCard } from '@/app/admin/components/OrderSummaryCard';
import { ItemsList, type ItemWithCatalog } from '@/app/admin/components/ItemsList';
import { CostsAndProfitCard } from '@/app/admin/components/CostsAndProfitCard';
import { StatusUpdateCard } from '@/app/admin/components/StatusUpdateCard';
import { PaymentCard } from '@/app/admin/components/PaymentCard';
import { RemoveOrderButton } from '@/app/admin/components/RemoveOrderButton';
import { canEditCosts, canChangeStatus, canRefund } from '@/lib/adminRbac';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ order_id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function AdminV2OrderDetailPage({ params, searchParams }: PageProps) {
  const { order_id } = await params;
  const { returnTo } = await searchParams;
  const session = await auth();
  const { order, items, statusHistory, error } = await getOrderByOrderId(order_id);
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const backHref = returnTo && returnTo.startsWith('/admin') ? returnTo : '/admin/orders';

  if (error) {
    const errBackHref = returnTo && returnTo.startsWith('/admin') ? returnTo : '/admin/orders';
    return (
      <div className="admin-v2-detail">
        <header className="admin-v2-header">
          <Link href={errBackHref} className="admin-v2-link">← Back to orders</Link>
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

  // Merge addOns from order_json (Card, Wrapping, Message) into items.
  // order_items table has no add-on columns; order_json stores full order with addOns.
  const jsonItems = (order.order_json as { items?: Array<{ addOns?: { cardType?: string; wrappingOption?: string; cardMessage?: string }; bouquetSlug?: string }> } | undefined)?.items ?? [];
  const itemsWithCatalog: ItemWithCatalog[] = await Promise.all(
    items.map(async (item, index) => {
      let catalogHref: string | undefined;
      if (item.bouquet_id) {
        const bouquet = await getBouquetById(item.bouquet_id);
        if (bouquet) {
          catalogHref = `/en/catalog/${bouquet.slug}`;
        } else {
          const product = await getProductById(item.bouquet_id);
          const slug = product ? (jsonItems[index]?.bouquetSlug ?? undefined) : undefined;
          catalogHref = slug ? `/en/catalog/${slug}` : undefined;
        }
      } else {
        catalogHref = undefined;
      }
      const jsonItem = jsonItems[index];
      const addOns = jsonItem?.addOns
        ? {
            cardType: (jsonItem.addOns.cardType as 'free' | 'premium' | null) ?? undefined,
            wrappingOption: jsonItem.addOns.wrappingOption ?? undefined,
            cardMessage: jsonItem.addOns.cardMessage ?? undefined,
          }
        : undefined;
      return { ...item, catalogHref, addOns };
    })
  );

  return (
    <div className="admin-v2-detail">
      <header className="admin-v2-header admin-page-header">
        <div>
          <Link href={backHref} className="admin-v2-link" style={{ display: 'inline-block', marginBottom: 8 }}>
            ← Back to orders
          </Link>
          <h1 className="admin-v2-title">{order.order_id}</h1>
          <p className="admin-v2-hint">Order details from Supabase</p>
        </div>
        <div className="admin-v2-header-actions">
          <Link href={`/order/${order.order_id}`} target="_blank" rel="noopener noreferrer" className="admin-v2-btn admin-v2-btn-outline">
            View public page
          </Link>
          <RemoveOrderButton
            orderId={order.order_id}
            returnTo={backHref}
            canEdit={canChangeStatus(role)}
          />
        </div>
      </header>

      <StatusUpdateCard
        order={order}
        canEdit={canChangeStatus(role)}
        canRefund={canRefund(role)}
      />
      <PaymentCard order={order} canMarkPaid={canChangeStatus(role)} />
      <OrderSummaryCard order={order} />
      <CostsAndProfitCard order={order} items={items} canEdit={canEditCosts(role)} />
      <ItemsList items={itemsWithCatalog} />
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
