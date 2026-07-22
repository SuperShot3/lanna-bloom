import Link from 'next/link';
import { auth } from '@/auth';
import { getOrderByOrderId, getOrderDeliveryChangeHistory } from '@/lib/supabase/adminQueries';
import { itemsFromOrderJson } from '@/lib/admin/orderItemsFallback';
import { getBouquetById, getProductById } from '@/lib/sanity';
import { OrderSummaryCard } from '@/app/admin/components/OrderSummaryCard';
import type { ItemWithCatalog } from '@/app/admin/components/ItemsList';
import { OrderStatusPaymentCard } from '@/app/admin/components/OrderStatusPaymentCard';
import { RemoveOrderButton } from '@/app/admin/components/RemoveOrderButton';
import { RefundOrderButton } from '@/app/admin/components/RefundOrderButton';
import { CustomOrderDetailsSection } from '@/app/admin/components/CustomOrderDetailsSection';
import { DeliveryEditCard } from '@/app/admin/components/DeliveryEditCard';
import { OrderHistoryTimeline } from '@/app/admin/components/OrderHistoryTimeline';
import type { CustomOrderDetails } from '@/lib/orders';
import { canChangeStatus, canEditCosts, canRefund, canRemoveOrder } from '@/lib/adminRbac';
import { orderHasIncomeRefund } from '@/lib/accounting/incomeRefunds';
import { getCogsExpenseByOrderId, getDeliveryExpenseSyncedFromOrderCosts } from '@/lib/expenses/expenseQueries';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ order_id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function AdminOrderDetailPage({ params, searchParams }: PageProps) {
  const { order_id } = await params;
  const { returnTo } = await searchParams;
  const session = await auth();
  const { order, items, statusHistory, error } = await getOrderByOrderId(order_id);
  const deliveryChanges = await getOrderDeliveryChangeHistory(order_id);
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
      addOns?: { cardType?: string; wrappingOption?: string; cardMessage?: string; balloonText?: string; paperColor?: string };
    }>;
  } | undefined;
  const jsonItems = jsonPayload?.items ?? [];
  const itemsToUse =
    items.length > 0 ? items : jsonItems.length > 0 ? itemsFromOrderJson(order.order_id, jsonItems) : [];

  const customOrderDetails = (order.order_json as { customOrderDetails?: CustomOrderDetails } | null | undefined)
    ?.customOrderDetails;
  const cogsExpense = await getCogsExpenseByOrderId(order_id);
  const deliveryExpense = await getDeliveryExpenseSyncedFromOrderCosts(order_id);
  const hasRefund = canRefund(role) ? await orderHasIncomeRefund(order_id) : false;
  const orderStatusUpper = String(order.order_status ?? '').toUpperCase();
  const paidTotal =
    Math.round(
      (parseFloat(String(order.grand_total ?? order.total_amount ?? 0)) || 0) * 100
    ) / 100;
  const paymentFeeRaw =
    order.payment_fee != null ? parseFloat(String(order.payment_fee)) : NaN;
  const paymentFee = Number.isFinite(paymentFeeRaw) ? paymentFeeRaw : null;
  let refundDisabledReason: string | null = null;
  if (hasRefund) refundDisabledReason = 'a refund is already recorded';
  else if (orderStatusUpper === 'CANCELLED') refundDisabledReason = 'order is already cancelled';
  else if (String(order.payment_status ?? '').toUpperCase() !== 'PAID') {
    refundDisabledReason = 'order is not paid';
  }

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
            paperColor: jsonItem.addOns.paperColor ?? undefined,
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
          <Link
            href={(() => {
              // Public order page now requires ?token=
              // Keep server-side to avoid exposing admin queries to the client.
              const base = `/order/${encodeURIComponent(order.order_id)}`;
              return order.public_token ? `${base}?token=${encodeURIComponent(String(order.public_token))}` : base;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-outline"
          >
            View public page
          </Link>
        </div>
      </header>

      <OrderStatusPaymentCard
        order={order}
        items={itemsToUse}
        canEditStatus={canChangeStatus(role)}
        canMarkPaid={canChangeStatus(role)}
        canEditCosts={canEditCosts(role)}
        initialCogsExpense={cogsExpense}
        initialDeliveryExpense={deliveryExpense}
      />
      <OrderSummaryCard
        order={order}
        items={itemsWithCatalog}
        customGreetingCard={customOrderDetails?.greetingCard}
      />
      {customOrderDetails && <CustomOrderDetailsSection details={customOrderDetails} />}
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
      <DeliveryEditCard order={order} canEdit={canChangeStatus(role)} />
      <OrderHistoryTimeline statusHistory={statusHistory} deliveryChanges={deliveryChanges} />

      {(canRefund(role) || canRemoveOrder(role)) && (
        <section className="admin-section admin-order-remove-footer" aria-label="Order actions">
          {canRefund(role) && (
            <>
              <h2 className="admin-section-title">Refund order</h2>
              <p className="admin-hint" style={{ marginBottom: 12 }}>
                Record a refund in Lanna Bloom accounting and cancel this order. Issue the customer
                refund in Stripe separately, then enter the Stripe commission here for accurate books.
              </p>
              <div style={{ marginBottom: canRemoveOrder(role) ? 24 : 0 }}>
                <RefundOrderButton
                  orderId={order.order_id}
                  customerName={order.customer_name}
                  paymentMethod={order.payment_method}
                  paidTotal={paidTotal}
                  paymentFee={paymentFee}
                  disabledReason={refundDisabledReason}
                  canEdit
                />
              </div>
            </>
          )}
          {canRemoveOrder(role) && (
            <>
              <h2 className="admin-section-title">Remove order</h2>
              <p className="admin-hint" style={{ marginBottom: 12 }}>
                Delete this order from the system after delivery. This cannot be undone.
              </p>
              <RemoveOrderButton orderId={order.order_id} returnTo={backHref} canEdit />
            </>
          )}
        </section>
      )}
    </div>
  );
}
