'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseOrderItemRow, SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import type { Expense } from '@/types/expenses';
import { DeliveredEmailPreviewModal, type DeliveredPreviewPayload } from './DeliveredEmailPreviewModal';
import { OrderCostsModal } from './OrderCostsModal';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  formatOrderStatus,
  formatPaymentStatus,
  normalizeOrderStatus,
} from '@/lib/orders/statusConstants';

const MANUAL_PAYMENT_METHODS = ['PROMPTPAY', 'BANK_TRANSFER'];

type LinkedExpenseRef = Pick<Expense, 'id' | 'receipt_attached' | 'receipt_file_path'> | null;

function paymentMethodLabel(method: string | null): string {
  switch ((method ?? '').toUpperCase()) {
    case 'STRIPE':
      return 'Stripe (card)';
    case 'PROMPTPAY':
      return 'PromptPay';
    case 'BANK_TRANSFER':
      return 'Bank transfer';
    default:
      return method ?? '—';
  }
}

interface OrderStatusPaymentCardProps {
  order: SupabaseOrderRow;
  items: SupabaseOrderItemRow[];
  canEditStatus: boolean;
  canMarkPaid: boolean;
  canEditCosts: boolean;
  initialCogsExpense?: LinkedExpenseRef;
  initialDeliveryExpense?: LinkedExpenseRef;
}

export function OrderStatusPaymentCard({
  order,
  items,
  canEditStatus,
  canMarkPaid,
  canEditCosts,
  initialCogsExpense = null,
  initialDeliveryExpense = null,
}: OrderStatusPaymentCardProps) {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState(normalizeOrderStatus(order.order_status));
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingPaid, setSavingPaid] = useState(false);
  const [savingPaymentStatus, setSavingPaymentStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [deliveredPreview, setDeliveredPreview] = useState<DeliveredPreviewPayload | null>(null);
  const [costsOpen, setCostsOpen] = useState(false);

  const paymentMethod = (order.payment_method ?? 'BANK_TRANSFER').toUpperCase();
  const paymentStatus = (order.payment_status ?? 'NOT_PAID').toUpperCase();
  const isManual = MANUAL_PAYMENT_METHODS.includes(paymentMethod);
  const showMarkPaidButton = canMarkPaid && isManual && paymentStatus !== 'PAID';
  const missingCogs =
    paymentStatus === 'PAID' && (order.cogs_amount == null || Number(order.cogs_amount) <= 0);

  const handleOrderStatusChange = async (newStatus: string) => {
    if (!canEditStatus || savingOrder) return;
    const normalized = normalizeOrderStatus(newStatus);
    if (normalized === (order.order_status ?? 'NEW').toUpperCase()) return;
    setOrderStatus(normalized);
    setSavingOrder(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.order_id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error ?? 'Failed to update status' });
        setOrderStatus(normalizeOrderStatus(order.order_status));
        return;
      }
      setStatusMessage({ type: 'success', text: 'Order status updated' });
      setTimeout(() => setStatusMessage(null), 3000);
      const preview = (data as { deliveredEmailPreview?: DeliveredPreviewPayload | null })
        .deliveredEmailPreview;
      if (preview?.outboxId) {
        setDeliveredPreview(preview);
      }
      router.refresh();
    } catch (e) {
      setStatusMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
      setOrderStatus(normalizeOrderStatus(order.order_status));
    } finally {
      setSavingOrder(false);
    }
  };

  const handleSetPaymentStatus = async (nextStatus: 'NOT_PAID') => {
    if (!isManual || savingPaymentStatus || paymentStatus === nextStatus) return;
    setSavingPaymentStatus(true);
    setPaymentMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.order_id)}/payment-status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_status: nextStatus }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentMessage({ type: 'error', text: data.error ?? 'Failed to update payment status' });
        return;
      }
      setPaymentMessage({ type: 'success', text: 'Payment status updated' });
      setTimeout(() => setPaymentMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setPaymentMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSavingPaymentStatus(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!showMarkPaidButton || savingPaid) return;
    setSavingPaid(true);
    setPaymentMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.order_id)}/mark-paid`,
        { method: 'PATCH' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentMessage({ type: 'error', text: data.error ?? 'Failed to mark as paid' });
        return;
      }
      setPaymentMessage({ type: 'success', text: 'Order marked as paid' });
      setTimeout(() => setPaymentMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setPaymentMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSavingPaid(false);
    }
  };

  const message = statusMessage ?? paymentMessage;

  return (
    <section className="admin-section admin-status-card">
      <div className="admin-summary-card-header admin-status-card-header">
        <h2 className="admin-section-title">Status</h2>
        {canEditCosts && (
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-status-cogs-btn"
            onClick={() => setCostsOpen(true)}
            aria-label="Add order COGS and costs"
          >
            Add COGS
            {missingCogs && <span className="admin-status-cogs-dot" aria-hidden />}
          </button>
        )}
      </div>

      <div className="admin-status-payment-row">
        <div className="admin-status-payment-group">
          <label htmlFor="order-status">Order status</label>
          {canEditStatus ? (
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
            <p style={{ margin: 0 }}>
              <span className={`admin-badge admin-badge-${orderStatus.toLowerCase()}`}>
                {formatOrderStatus(orderStatus)}
              </span>
            </p>
          )}
        </div>

        <div className="admin-status-payment-group">
          <span className="admin-status-payment-label">Payment</span>
          <div className="admin-status-payment-content">
            <p className="admin-muted" style={{ margin: 0 }}>
              {paymentMethodLabel(order.payment_method)} ·{' '}
              <span className={`admin-badge admin-badge-payment-${paymentStatus.toLowerCase()}`}>
                {formatPaymentStatus(paymentStatus)}
              </span>
              {order.paid_at ? (
                <span className="admin-muted"> · {new Date(order.paid_at).toLocaleString()}</span>
              ) : null}
            </p>
            {isManual && paymentStatus !== 'PAID' && (
              <div className="admin-status-row" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-sm admin-btn-outline"
                  disabled={savingPaymentStatus || paymentStatus === 'NOT_PAID'}
                  onClick={() => handleSetPaymentStatus('NOT_PAID')}
                >
                  {savingPaymentStatus && paymentStatus !== 'NOT_PAID' ? 'Saving…' : 'Pending payment'}
                </button>
                {showMarkPaidButton && (
                  <button
                    type="button"
                    onClick={handleMarkPaid}
                    disabled={savingPaid}
                    className="admin-btn admin-btn-sm admin-btn-primary"
                  >
                    {savingPaid ? 'Saving…' : 'Mark as paid'}
                  </button>
                )}
              </div>
            )}
            {showMarkPaidButton && !isManual && (
              <div className="admin-payment-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleMarkPaid}
                  disabled={savingPaid}
                  className="admin-btn admin-btn-sm admin-btn-primary"
                >
                  {savingPaid ? 'Saving…' : 'Mark as paid'}
                </button>
              </div>
            )}
            {paymentMethod === 'STRIPE' && paymentStatus !== 'PAID' && (
              <p className="admin-muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
                Stripe updates automatically when payment completes.
              </p>
            )}
          </div>
        </div>
      </div>

      {message && (
        <p className={message.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
          {message.text}
        </p>
      )}

      {deliveredPreview && (
        <DeliveredEmailPreviewModal
          key={deliveredPreview.outboxId}
          open={!!deliveredPreview}
          orderId={order.order_id}
          initial={deliveredPreview}
          onClose={() => setDeliveredPreview(null)}
        />
      )}

      {canEditCosts && (
        <OrderCostsModal
          open={costsOpen}
          onClose={() => setCostsOpen(false)}
          order={order}
          items={items}
          canEdit={canEditCosts}
          initialCogsExpense={initialCogsExpense}
          initialDeliveryExpense={initialDeliveryExpense}
        />
      )}
    </section>
  );
}
