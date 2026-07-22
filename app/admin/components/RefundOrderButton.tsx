'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'amounts' | 'confirm';

interface RefundOrderButtonProps {
  orderId: string;
  customerName: string | null;
  paymentMethod: string | null;
  paidTotal: number;
  paymentFee: number | null;
  /** When true, button is hidden (already cancelled or refund recorded). */
  disabledReason?: string | null;
  canEdit: boolean;
}

function fmtThb(n: number): string {
  return `฿${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

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

function parseInputMoney(raw: string): number | null {
  const t = raw.trim().replace(/,/g, '');
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function RefundOrderButton({
  orderId,
  customerName,
  paymentMethod,
  paidTotal,
  paymentFee,
  disabledReason,
  canEdit,
}: RefundOrderButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('amounts');
  const [refunding, setRefunding] = useState(false);
  const [amountStr, setAmountStr] = useState(String(paidTotal));
  const [commissionStr, setCommissionStr] = useState(
    paymentFee != null && Number.isFinite(paymentFee) ? String(paymentFee) : ''
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!canEdit) return null;
  if (disabledReason) {
    return (
      <p className="admin-hint" style={{ marginTop: 8 }}>
        Refund unavailable: {disabledReason}
      </p>
    );
  }

  const resetAndClose = () => {
    if (refunding) return;
    setOpen(false);
    setStep('amounts');
    setFormError(null);
    setAmountStr(String(paidTotal));
    setCommissionStr(
      paymentFee != null && Number.isFinite(paymentFee) ? String(paymentFee) : ''
    );
    setNotes('');
  };

  const openModal = () => {
    setAmountStr(String(paidTotal));
    setCommissionStr(
      paymentFee != null && Number.isFinite(paymentFee) ? String(paymentFee) : ''
    );
    setNotes('');
    setFormError(null);
    setStep('amounts');
    setOpen(true);
  };

  const goToConfirm = () => {
    setFormError(null);
    const amount = parseInputMoney(amountStr);
    const commission = parseInputMoney(commissionStr);
    if (amount == null || amount <= 0) {
      setFormError('Enter a refund amount greater than 0.');
      return;
    }
    if (amount > paidTotal + 0.001) {
      setFormError(`Refund amount cannot exceed order total (${fmtThb(paidTotal)}).`);
      return;
    }
    if (commission == null || commission < 0) {
      setFormError('Enter the Stripe commission (0 or more).');
      return;
    }
    setStep('confirm');
  };

  const performRefund = async () => {
    const amount = parseInputMoney(amountStr);
    const commission = parseInputMoney(commissionStr);
    if (amount == null || commission == null) {
      setFormError('Invalid amounts.');
      setStep('amounts');
      return;
    }
    setRefunding(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          stripe_commission: commission,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === 'string' ? data.error : 'Failed to refund order');
        setStep('amounts');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Network error');
      setStep('amounts');
    } finally {
      setRefunding(false);
    }
  };

  const amount = parseInputMoney(amountStr) ?? 0;
  const commission = parseInputMoney(commissionStr) ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={refunding}
        className="admin-btn admin-btn-outline admin-btn-danger"
        title="Record refund in Lanna Bloom accounting"
      >
        Refund
      </button>

      {open && (
        <div
          className="admin-product-detail-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refund-order-modal-title"
        >
          <div
            className="admin-product-detail-delete-modal-backdrop"
            onClick={resetAndClose}
            aria-hidden
          />
          <div className="admin-product-detail-delete-modal-content" style={{ position: 'relative' }}>
            {refunding && (
              <div
                className="admin-refund-processing"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="admin-refund-processing-spinner" aria-hidden />
                <p>Refunding…</p>
              </div>
            )}

            {step === 'amounts' ? (
              <>
                <h3 id="refund-order-modal-title">Refund order</h3>
                <p className="admin-hint" style={{ marginTop: 0 }}>
                  Records the refund in Lanna Bloom accounting and cancels this order. Customer refund
                  must be issued in Stripe separately.
                </p>
                <div className="admin-costs-input-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="refund-amount">Refund amount (THB)</label>
                  <input
                    id="refund-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={amountStr}
                    disabled={refunding}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="admin-input"
                  />
                </div>
                <div className="admin-costs-input-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="refund-commission">Stripe commission / fee (THB)</label>
                  <input
                    id="refund-commission"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={commissionStr}
                    disabled={refunding}
                    onChange={(e) => setCommissionStr(e.target.value)}
                    className="admin-input"
                    placeholder="Enter actual Stripe fee"
                  />
                </div>
                <div className="admin-costs-input-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="refund-notes">Notes (optional)</label>
                  <input
                    id="refund-notes"
                    type="text"
                    value={notes}
                    disabled={refunding}
                    onChange={(e) => setNotes(e.target.value)}
                    className="admin-input"
                    maxLength={500}
                  />
                </div>
                {formError && <p className="admin-costs-error">{formError}</p>}
                <div className="admin-product-detail-delete-modal-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    disabled={refunding}
                    onClick={resetAndClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={refunding}
                    onClick={goToConfirm}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 id="refund-order-modal-title">Confirm refund</h3>
                <p style={{ marginBottom: 12 }}>
                  Are you sure you want to refund this order? This cannot be undone in Lanna Bloom.
                </p>
                <dl className="admin-refund-summary">
                  <div>
                    <dt>Order</dt>
                    <dd>{orderId}</dd>
                  </div>
                  <div>
                    <dt>Customer</dt>
                    <dd>{customerName?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt>Payment method</dt>
                    <dd>{paymentMethodLabel(paymentMethod)}</dd>
                  </div>
                  <div>
                    <dt>Paid total</dt>
                    <dd>{fmtThb(paidTotal)}</dd>
                  </div>
                  <div>
                    <dt>Refund amount</dt>
                    <dd>{fmtThb(amount)}</dd>
                  </div>
                  <div>
                    <dt>Stripe commission</dt>
                    <dd>{fmtThb(commission)}</dd>
                  </div>
                  {Math.abs(amount - paidTotal) < 0.01 && (
                    <div>
                      <dt>Shop loss (fee kept by Stripe)</dt>
                      <dd>{fmtThb(commission)}</dd>
                    </div>
                  )}
                </dl>
                {formError && <p className="admin-costs-error">{formError}</p>}
                <div className="admin-product-detail-delete-modal-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    disabled={refunding}
                    onClick={() => {
                      setFormError(null);
                      setStep('amounts');
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={refunding}
                    onClick={performRefund}
                  >
                    {refunding ? 'Refunding…' : 'Confirm refund'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-refund-summary {
          margin: 0 0 16px;
          padding: 12px 14px;
          border: 1px solid var(--admin-border, #e5e0d8);
          border-radius: 8px;
          background: var(--admin-surface-muted, #faf8f5);
        }
        .admin-refund-summary > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 4px 0;
          font-size: 0.9rem;
        }
        .admin-refund-summary dt {
          margin: 0;
          color: var(--admin-muted, #6b6560);
          font-weight: 500;
        }
        .admin-refund-summary dd {
          margin: 0;
          font-weight: 600;
          text-align: right;
        }
        .admin-refund-processing {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: inherit;
          background: rgba(255, 255, 255, 0.88);
        }
        .admin-refund-processing p {
          margin: 0;
          font-weight: 600;
        }
        .admin-refund-processing-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid #e5e0d8;
          border-top-color: #8b3a3a;
          border-radius: 50%;
          animation: admin-refund-spin 0.7s linear infinite;
        }
        @keyframes admin-refund-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
