import Link from 'next/link';
import { auth } from '@/auth';
import { getOrderByOrderId } from '@/lib/supabase/adminQueries';
import { itemsFromOrderJson } from '@/lib/admin/orderItemsFallback';
import { getBouquetById, getProductById } from '@/lib/sanity';
import { OrderSummaryCard } from '@/app/admin/components/OrderSummaryCard';
import type { ItemWithCatalog } from '@/app/admin/components/ItemsList';
import { StatusUpdateCard } from '@/app/admin/components/StatusUpdateCard';
import { PaymentCard } from '@/app/admin/components/PaymentCard';
import { RemoveOrderButton } from '@/app/admin/components/RemoveOrderButton';
import { CustomOrderDetailsSection } from '@/app/admin/components/CustomOrderDetailsSection';
import type { CustomOrderDetails } from '@/lib/orders';
import { canChangeStatus, canRefund, canRemoveOrder } from '@/lib/adminRbac';
import { notFound } from 'next/navigation';
import { formatShopDateTime } from '@/lib/shopTime';

interface PageProps {
  params: Promise<{ order_id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function AdminOrderDetailPage({ params, searchParams }: PageProps) {
  const { order_id } = await params;
  const { returnTo } = await searchParams;
  const session = await auth();
  const { order, items, statusHistory, error } = await getOrderByOrderId(order_id);
  const role = session?.user ? (session.user as { role?: string }).role : undefined;
  const backHref = returnTo && returnTo.startsWith('/admin') ? returnTo : '/admin/orders';

  if (error) {
    const errBackHref = returnTo && returnTo.startsWith('/admin') ? returnTo : '/admin/orders';
    return (
      <div className="admin-detail">
        <header className="admin-header">
          <Link href={errBackHref} className="admin-link">← Back to orders</Link>
        </header>
        <div className="admin-error">
          <p><strong>Error loading order</strong></p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  // order_items table may be empty for some orders; fall back to order_json.items so we always show line items.
  const jsonPayload = order.order_json as {
    items?: Array<{
      bouquetId?: string;
      bouquetTitle?: string;
      size?: string;
      price?: number;
      imageUrl?: string;
      bouquetSlug?: string;
      itemType?: string;
      cost?: number;
      commissionAmount?: number;
      addOns?: { cardType?: string; wrappingOption?: string; cardMessage?: string; balloonText?: string };
    }>;
  } | undefined;
  const jsonItems = jsonPayload?.items ?? [];
  const itemsToUse =
    items.length > 0 ? items : jsonItems.length > 0 ? itemsFromOrderJson(order.order_id, jsonItems) : [];

  const customOrderDetails = (order.order_json as { customOrderDetails?: CustomOrderDetails } | null | undefined)
    ?.customOrderDetails;

  const itemsWithCatalog: ItemWithCatalog[] = await Promise.all(
    itemsToUse.map(async (item, index) => {
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
            balloonText: jsonItem.addOns.balloonText ?? undefined,
          }
        : undefined;
      return { ...item, catalogHref, addOns };
    })
  );

  return (
    <div className="admin-detail">
      <header className="admin-header admin-page-header">
        <div>
          <Link href={backHref} className="admin-link" style={{ display: 'inline-block', marginBottom: 8 }}>
            ← Back to orders
          </Link>
          <h1 className="admin-title">{order.order_id}</h1>
          <p className="admin-hint">Order details from Supabase</p>
        </div>
        <div className="admin-header-actions">
          <Link href={`/order/${order.order_id}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-outline">
            View public page
          </Link>
        </div>
      </header>

      <StatusUpdateCard
        order={order}
        canEdit={canChangeStatus(role)}
        canRefund={canRefund(role)}
      />
      <PaymentCard order={order} canMarkPaid={canChangeStatus(role)} />
      <OrderSummaryCard
        order={order}
        items={itemsWithCatalog}
        customGreetingCard={customOrderDetails?.greetingCard}
      />
      {customOrderDetails && <CustomOrderDetailsSection details={customOrderDetails} />}
      <section className="admin-section">
        <h2 className="admin-section-title">Costs & profit</h2>
        <p className="admin-hint" style={{ marginBottom: 12 }}>
          Per-order COGS, delivery cost, payment fee, and profit are managed under Accounting (same data as before).
        </p>
        <Link
          href={`/admin/accounting/orders/${encodeURIComponent(order.order_id)}`}
          className="admin-btn admin-btn-outline"
        >
          Edit costs & profit in Accounting
        </Link>
      </section>
      {(order.driver_name || order.driver_phone) && (
        <section className="admin-section">
          <h2 className="admin-section-title">Driver (internal)</h2>
          <p><strong>Name:</strong> {order.driver_name ?? '—'}</p>
          <p><strong>Phone:</strong> {order.driver_phone ?? '—'}</p>
        </section>
      )}
      {order.internal_notes && (
        <section className="admin-section">
          <h2 className="admin-section-title">Notes</h2>
          <p>{order.internal_notes}</p>
        </section>
      )}
      {statusHistory.length > 0 && (
        <section className="admin-section">
          <h2 className="admin-section-title">Status history</h2>
          <ul className="admin-timeline">
            {statusHistory.map((h, i) => (
              <li key={i}>
                <span className="admin-timeline-status">
                  {h.from_status ?? '—'} → {h.to_status ?? '—'}
                </span>
                <span className="admin-timeline-date">
                  {h.created_at ? formatShopDateTime(h.created_at) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canRemoveOrder(role) && (
        <section className="admin-section admin-order-remove-footer" aria-label="Remove order">
          <h2 className="admin-section-title">Remove order</h2>
          <p className="admin-hint" style={{ marginBottom: 12 }}>
            Delete this order from the system after delivery. This cannot be undone.
          </p>
          <RemoveOrderButton orderId={order.order_id} returnTo={backHref} canEdit />
        </section>
      )}
    </div>
  );
}
