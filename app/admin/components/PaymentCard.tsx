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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const paymentMethod = (order.payment_method ?? 'BANK_TRANSFER').toUpperCase();
  const paymentStatus = (order.payment_status ?? 'NOT_PAID').toUpperCase();
  const isManual = MANUAL_PAYMENT_METHODS.includes(paymentMethod);
  const showMarkPaidButton = canMarkPaid && isManual && paymentStatus !== 'PAID';

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
      <div className="admin-status-grid">
        <div className="admin-status-group">
          <label>Payment method</label>
          <p>
            <span className="admin-badge admin-badge-payment-method">
              {paymentMethodLabel(order.payment_method)}
            </span>
          </p>
        </div>
        <div className="admin-status-group">
          <label>Payment status</label>
          <p>
            <span
              className={`admin-badge admin-badge-payment-${(paymentStatus ?? '').toLowerCase()}`}
            >
              {formatPaymentStatus(paymentStatus)}
            </span>
          </p>
        </div>
      </div>
      {order.paid_at && (
        <p className="admin-muted">
          Paid at: {new Date(order.paid_at).toLocaleString()}
        </p>
      )}
      {showMarkPaidButton && (
        <div className="admin-payment-actions">
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={saving}
            className="admin-btn admin-btn-primary"
          >
            {saving ? 'Saving…' : 'Mark as Paid'}
          </button>
        </div>
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
