'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import { formatPaymentStatus } from '@/lib/orders/statusConstants';

const MANUAL_PAYMENT_METHODS = ['PROMPTPAY', 'BANK_TRANSFER'];

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

interface PaymentCardProps {
  order: SupabaseOrderRow;
  canMarkPaid: boolean;
}

export function PaymentCard({ order, canMarkPaid }: PaymentCardProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const paymentMethod = (order.payment_method ?? 'BANK_TRANSFER').toUpperCase();
  const paymentStatus = (order.payment_status ?? 'NOT_PAID').toUpperCase();
  const isManual = MANUAL_PAYMENT_METHODS.includes(paymentMethod);
  const showMarkPaidButton = canMarkPaid && isManual && paymentStatus !== 'PAID';

  const handleSetPaymentStatus = async (nextStatus: 'NOT_PAID' | 'READY_TO_PAY') => {
    if (!isManual || savingStatus || paymentStatus === nextStatus) return;
    setSavingStatus(true);
    setMessage(null);
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
        setMessage({ type: 'error', text: data.error ?? 'Failed to update payment status' });
        return;
      }
      setMessage({ type: 'success', text: 'Payment status updated' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!showMarkPaidButton || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.order_id)}/mark-paid`,
        { method: 'PATCH' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to mark as paid' });
        return;
      }
      setMessage({ type: 'success', text: 'Order marked as paid' });
      setTimeout(() => setMessage(null), 3000);
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section admin-payment-card">
      <h2 className="admin-section-title">Payment</h2>
      <p className="admin-muted" style={{ marginBottom: canMarkPaid ? 8 : 0 }}>
        Method: {paymentMethodLabel(order.payment_method)} · Status: {formatPaymentStatus(paymentStatus)}
      </p>
      {order.paid_at && (
        <p className="admin-muted" style={{ marginTop: 0, marginBottom: canMarkPaid ? 12 : 0 }}>
          Paid at: {new Date(order.paid_at).toLocaleString()}
        </p>
      )}
      {isManual && paymentStatus !== 'PAID' && (
        <div className="admin-status-row" style={{ marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            disabled={savingStatus || paymentStatus === 'NOT_PAID'}
            onClick={() => handleSetPaymentStatus('NOT_PAID')}
          >
            {savingStatus && paymentStatus !== 'NOT_PAID' ? 'Saving…' : 'Not ready'}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm admin-btn-outline"
            disabled={savingStatus || paymentStatus === 'READY_TO_PAY'}
            onClick={() => handleSetPaymentStatus('READY_TO_PAY')}
          >
            {savingStatus && paymentStatus !== 'READY_TO_PAY' ? 'Saving…' : 'Ready to pay'}
          </button>
          {showMarkPaidButton && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={saving}
              className="admin-btn admin-btn-sm admin-btn-primary"
            >
              {saving ? 'Saving…' : 'Mark as paid'}
            </button>
          )}
        </div>
      )}
      {showMarkPaidButton && (
        !isManual && (
          <div className="admin-payment-actions">
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={saving}
              className="admin-btn admin-btn-primary"
            >
              {saving ? 'Saving…' : 'Mark as paid'}
            </button>
          </div>
        )
      )}
      {paymentMethod === 'STRIPE' && paymentStatus !== 'PAID' && (
        <p className="admin-muted">
          Stripe orders are updated automatically when payment completes.
        </p>
      )}
      {message && (
        <p className={message.type === 'success' ? 'admin-costs-success' : 'admin-costs-error'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
