'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  formatOrderStatus,
  normalizeOrderStatus,
} from '@/lib/orders/statusConstants';

interface StatusUpdateCardProps {
  order: SupabaseOrderRow;
  canEdit: boolean;
  canRefund?: boolean;
}

/** Order fulfillment status only. Payment status and "Mark as Paid" live in PaymentCard. */
export function StatusUpdateCard({ order, canEdit }: StatusUpdateCardProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(normalizeOrderStatus(order.order_status));
  const [savingOrder, setSavingOrder] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOrderStatusChange = async (newStatus: string) => {
    if (!canEdit || savingOrder) return;
    const normalized = normalizeOrderStatus(newStatus);
    if (normalized === (order.order_status ?? 'NEW').toUpperCase()) return;
    setOrderStatus(normalized);
    setSavingOrder(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update status' });
        setOrderStatus(normalizeOrderStatus(order.order_status));
        return;
      }
      setMessage({ type: 'success', text: 'Order status updated' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
      setOrderStatus(normalizeOrderStatus(order.order_status));
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <section className="admin-section admin-status-card">
      <h2 className="admin-section-title">Status</h2>
      <div className="admin-status-grid">
        <div className="admin-status-group">
          <label htmlFor="order-status">Order status</label>
          {canEdit ? (
            <div className="admin-status-row">
              <select
                id="order-status"
                value={orderStatus}
                onChange={(e) => handleOrderStatusChange(e.target.value)}
                disabled={savingOrder}
                className="admin-select"
              >
                {ORDER_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              {savingOrder && <span className="admin-muted">Saving…</span>}
            </div>
          ) : (
            <p>
              <span className={`admin-badge admin-badge-${orderStatus.toLowerCase()}`}>
                {formatOrderStatus(orderStatus)}
              </span>
            </p>
          )}
        </div>
      </div>
      {message && (
        <p className={message.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
