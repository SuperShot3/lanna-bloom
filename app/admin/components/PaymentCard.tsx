'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

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
  const paymentStatus = order.payment_status ?? 'PENDING';
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
    <section className="admin-v2-section admin-v2-payment-card">
      <h2 className="admin-v2-section-title">Payment</h2>
      <div className="admin-v2-status-grid">
        <div className="admin-v2-status-group">
          <label>Payment method</label>
          <p>
            <span className="admin-v2-badge admin-v2-badge-payment-method">
              {paymentMethodLabel(order.payment_method)}
            </span>
          </p>
        </div>
        <div className="admin-v2-status-group">
          <label>Payment status</label>
          <p>
            <span
              className={`admin-v2-badge admin-v2-badge-payment-${(paymentStatus ?? '').toLowerCase()}`}
            >
              {paymentStatus ?? '—'}
            </span>
          </p>
        </div>
      </div>
      {order.paid_at && (
        <p className="admin-v2-muted">
          Paid at: {new Date(order.paid_at).toLocaleString()}
        </p>
      )}
      {showMarkPaidButton && (
        <div className="admin-v2-payment-actions">
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={saving}
            className="admin-v2-btn admin-v2-btn-primary"
          >
            {saving ? 'Saving…' : 'Mark as Paid'}
          </button>
        </div>
      )}
      {paymentMethod === 'STRIPE' && paymentStatus !== 'PAID' && (
        <p className="admin-v2-muted">
          Stripe orders are updated automatically when payment completes.
        </p>
      )}
      {message && (
        <p className={message.type === 'success' ? 'admin-v2-costs-success' : 'admin-v2-costs-error'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
