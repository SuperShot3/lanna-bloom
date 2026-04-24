'use client';

import Link from 'next/link';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import { formatOrderStatus, formatPaymentStatus, normalizeOrderStatus } from '@/lib/orders/statusConstants';
import { formatShopDateTime } from '@/lib/shopTime';

interface OrderTableProps {
  orders: SupabaseOrderRow[];
  returnTo?: string;
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return `฿${Number(n).toLocaleString()}`;
}

/** Orders still in the delivery pipeline (not terminal). */
function isOpenPipelineStatus(status: string | null | undefined): boolean {
  const n = normalizeOrderStatus(status);
  return n !== 'DELIVERED' && n !== 'CANCELLED';
}

function statusBadgeClass(status: string | null | undefined): string {
  const raw = (status ?? '').trim();
  const slug = raw ? raw.toLowerCase().replace(/_/g, '-') : 'new';
  const open = isOpenPipelineStatus(status);
  return `admin-badge admin-badge-${slug}${open ? ' admin-badge-pipeline-open' : ''}`;
}

export function OrderTable({ orders, returnTo }: OrderTableProps) {
  const detailHref = (orderId: string) => {
    const base = `/admin/orders/${encodeURIComponent(orderId)}`;
    if (returnTo) return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
    return base;
  };
  return (
    <>
      {/* Desktop table */}
      <div className="admin-orders-table-wrap">
        <table className="admin-orders-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Order ID</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Discount</th>
              <th>Delivery date</th>
              <th>Window</th>
              <th>District</th>
              <th>Recipient</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.order_id}
                className={isOpenPipelineStatus(o.order_status) ? 'admin-order-row-pipeline' : undefined}
              >
                <td>{formatShopDateTime(o.created_at)}</td>
                <td>
                  <Link href={detailHref(o.order_id)} className="admin-link">
                    {o.order_id}
                  </Link>
                </td>
                <td>
                  <span className={statusBadgeClass(o.order_status)}>
                    {formatOrderStatus(o.order_status)}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge admin-badge-payment-${(o.payment_status ?? '').toLowerCase()}`}>
                    {formatPaymentStatus(o.payment_status)}
                  </span>
                </td>
                <td>{formatAmount(o.grand_total)}</td>
                <td>
                  {(o.referral_discount != null && o.referral_discount > 0)
                    ? `-${formatAmount(o.referral_discount)}`
                    : '—'}
                </td>
                <td>{o.delivery_date ?? '—'}</td>
                <td>{o.delivery_window ?? '—'}</td>
                <td>{o.district ?? '—'}</td>
                <td>{o.recipient_name ?? o.recipient_phone ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="admin-orders-cards">
        {orders.map((o) => (
          <Link
            key={o.order_id}
            href={detailHref(o.order_id)}
            className={`admin-order-card${isOpenPipelineStatus(o.order_status) ? ' admin-order-card-pipeline' : ''}`}
          >
            <div className="admin-order-card-header">
              <span className="admin-order-card-id">{o.order_id}</span>
              <span className={statusBadgeClass(o.order_status)}>
                {formatOrderStatus(o.order_status)}
              </span>
            </div>
            <div className="admin-order-card-row">
              <span className="admin-order-card-label">Payment</span>
              <span className={`admin-badge admin-badge-payment-${(o.payment_status ?? '').toLowerCase()}`}>
                {formatPaymentStatus(o.payment_status)}
              </span>
            </div>
            <div className="admin-order-card-row">
              <span className="admin-order-card-label">Total</span>
              <span className="admin-order-card-value">{formatAmount(o.grand_total)}</span>
            </div>
            <div className="admin-order-card-row">
              <span className="admin-order-card-label">Recipient</span>
              <span className="admin-order-card-value">{o.recipient_name ?? o.recipient_phone ?? '—'}</span>
            </div>
            <div className="admin-order-card-row">
              <span className="admin-order-card-label">Delivery</span>
              <span className="admin-order-card-value">{o.delivery_date ?? '—'} {o.delivery_window ?? ''}</span>
            </div>
            <div className="admin-order-card-row">
              <span className="admin-order-card-label">District</span>
              <span className="admin-order-card-value">{o.district ?? '—'}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
