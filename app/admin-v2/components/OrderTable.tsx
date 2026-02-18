'use client';

import Link from 'next/link';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

interface OrderTableProps {
  orders: SupabaseOrderRow[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return `฿${Number(n).toLocaleString()}`;
}

export function OrderTable({ orders }: OrderTableProps) {
  return (
    <div className="admin-v2-table-wrap">
      <table className="admin-v2-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>Order ID</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Total</th>
            <th>Delivery date</th>
            <th>Window</th>
            <th>District</th>
            <th>Recipient</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.order_id}>
              <td>{formatDate(o.created_at)}</td>
              <td>
                <Link href={`/admin-v2/orders/${encodeURIComponent(o.order_id)}`} className="admin-v2-link">
                  {o.order_id}
                </Link>
              </td>
              <td>
                <span className={`admin-v2-badge admin-v2-badge-${(o.order_status ?? '').toLowerCase()}`}>
                  {o.order_status ?? '—'}
                </span>
              </td>
              <td>
                <span className={`admin-v2-badge admin-v2-badge-payment-${(o.payment_status ?? '').toLowerCase()}`}>
                  {o.payment_status ?? '—'}
                </span>
              </td>
              <td>{formatAmount(o.grand_total)}</td>
              <td>{o.delivery_date ?? '—'}</td>
              <td>{o.delivery_window ?? '—'}</td>
              <td>{o.district ?? '—'}</td>
              <td>{o.recipient_name ?? o.recipient_phone ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
