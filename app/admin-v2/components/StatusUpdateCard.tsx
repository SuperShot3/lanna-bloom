'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

const ORDER_STATUSES = [
  'NEW',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
  'REFUNDED',
];

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];

/** Customer-facing fulfillment status (shown on order page) */
const FULFILLMENT_STATUSES = [
  'new',
  'confirmed',
  'preparing',
  'dispatched',
  'delivered',
  'cancelled',
  'issue',
] as const;

interface StatusUpdateCardProps {
  order: SupabaseOrderRow;
  canEdit: boolean;
  canRefund?: boolean;
}

export function StatusUpdateCard({ order, canEdit, canRefund = false }: StatusUpdateCardProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(order.order_status ?? 'NEW');
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status ?? 'PENDING');
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    order.fulfillment_status ?? 'new'
  );
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingFulfillment, setSavingFulfillment] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOrderStatusChange = async (newStatus: string) => {
    if (!canEdit || savingOrder) return;
    if (newStatus === (order.order_status ?? 'NEW')) return;
    setOrderStatus(newStatus);
    setSavingOrder(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update status' });
        setOrderStatus(order.order_status ?? 'NEW');
        return;
      }
      setMessage({ type: 'success', text: 'Status updated' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
      setOrderStatus(order.order_status ?? 'NEW');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleFulfillmentStatusChange = async (newStatus: string) => {
    if (!canEdit || savingFulfillment) return;
    if (newStatus === (order.fulfillment_status ?? 'new')) return;
    setFulfillmentStatus(newStatus);
    setSavingFulfillment(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.order_id)}/fulfillment-status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fulfillment_status: newStatus }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update fulfillment status' });
        setFulfillmentStatus(order.fulfillment_status ?? 'new');
        return;
      }
      setMessage({ type: 'success', text: 'Fulfillment status updated' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
      setFulfillmentStatus(order.fulfillment_status ?? 'new');
    } finally {
      setSavingFulfillment(false);
    }
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!canEdit || savingPayment) return;
    if (newStatus === (order.payment_status ?? 'PENDING')) return;
    setPaymentStatus(newStatus);
    setSavingPayment(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.order_id)}/payment-status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_status: newStatus }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update payment status' });
        setPaymentStatus(order.payment_status ?? 'PENDING');
        return;
      }
      setMessage({ type: 'success', text: 'Payment status updated' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
      setPaymentStatus(order.payment_status ?? 'PENDING');
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <section className="admin-v2-section admin-v2-status-card">
      <h2 className="admin-v2-section-title">Status</h2>
      <div className="admin-v2-status-grid">
        <div className="admin-v2-status-group">
          <label htmlFor="order-status">Order status</label>
          {canEdit ? (
            <div className="admin-v2-status-row">
              <select
                id="order-status"
                value={orderStatus}
                onChange={(e) => handleOrderStatusChange(e.target.value)}
                disabled={savingOrder}
                className="admin-v2-select"
              >
                {ORDER_STATUSES.filter((s) => s !== 'REFUNDED' || canRefund).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {savingOrder && <span className="admin-v2-muted">Saving…</span>}
            </div>
          ) : (
            <p>
              <span className={`admin-v2-badge admin-v2-badge-${(orderStatus ?? '').toLowerCase()}`}>
                {orderStatus ?? '—'}
              </span>
            </p>
          )}
        </div>
        <div className="admin-v2-status-group">
          <label htmlFor="fulfillment-status">Fulfillment status (customer-facing)</label>
          {canEdit ? (
            <div className="admin-v2-status-row">
              <select
                id="fulfillment-status"
                value={fulfillmentStatus}
                onChange={(e) => handleFulfillmentStatusChange(e.target.value)}
                disabled={savingFulfillment}
                className="admin-v2-select"
              >
                {FULFILLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              {savingFulfillment && <span className="admin-v2-muted">Saving…</span>}
            </div>
          ) : (
            <p>
              <span className={`admin-v2-badge admin-v2-badge-fulfillment-${fulfillmentStatus}`}>
                {fulfillmentStatus.charAt(0).toUpperCase() + fulfillmentStatus.slice(1)}
              </span>
            </p>
          )}
        </div>
        <div className="admin-v2-status-group">
          <label htmlFor="payment-status">Payment status</label>
          {canEdit ? (
            <div className="admin-v2-status-row">
              <select
                id="payment-status"
                value={paymentStatus}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                disabled={savingPayment}
                className="admin-v2-select"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {savingPayment && <span className="admin-v2-muted">Saving…</span>}
            </div>
          ) : (
            <p>
              <span
                className={`admin-v2-badge admin-v2-badge-payment-${(paymentStatus ?? '').toLowerCase()}`}
              >
                {paymentStatus ?? '—'}
              </span>
            </p>
          )}
        </div>
      </div>
      {message && (
        <p className={message.type === 'success' ? 'admin-v2-costs-success' : 'admin-v2-costs-error'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
