'use client';

import Image from 'next/image';
import type { PaymentMethodsAvailability } from '@/lib/checkout/paymentAvailability';

export type StickyBarSummary = {
  date?: string;
  timeSlot?: string;
  deliveryFee: number;
  total: number;
};

export type StickyBarProps = {
  lang: 'en' | 'th';
  summary: StickyBarSummary;
  availability: PaymentMethodsAvailability;
  statusMessage?: string;
  orderError?: string | null;
  placing: boolean;
  placingStripe: boolean;
  onPayStripe: () => void;
  onPlaceOrder: () => void;
  formatDate?: (dateStr: string) => string;
  labels: {
    dateLabel: string;
    deliveryFeeLabel: string;
    totalLabel: string;
    payWithStripe: string;
    completeDetailsToPay: string;
    placeOrder: string;
    redirecting: string;
    creating: string;
    unavailableRightNow: string;
  };
};

/** Reduced height - message now inline with summary/buttons. */
const STICKY_BAR_MIN_HEIGHT = 88;
const BUTTON_HEIGHT = 44;

export function StickyCheckoutBar({
  lang,
  summary,
  availability,
  statusMessage,
  orderError,
  placing,
  placingStripe,
  onPayStripe,
  onPlaceOrder,
  formatDate = (d) => d,
  labels,
}: StickyBarProps) {
  const stripeDisabled = !availability.stripe.enabled;
  const bankDisabled = !availability.bankTransfer.enabled;
  const stripeLoading = placingStripe;
  const bankLoading = placing;
  /** Pay button: disabled only when loading. When form incomplete, still clickable to scroll. */
  const stripeButtonDisabled = stripeLoading;
  const stripeLockedVisual = stripeDisabled && !stripeLoading;

  return (
    <div
      className="sticky-checkout-bar"
      role="region"
      aria-label={lang === 'th' ? 'ชำระเงิน' : 'Checkout'}
    >
      <div className="sticky-checkout-bar__inner">
        {/* Left: Summary */}
        <div className="sticky-checkout-bar__summary">
          {summary.date && summary.timeSlot && (
            <div className="sticky-checkout-bar__row sticky-checkout-bar__row--date">
              <span className="sticky-checkout-bar__label">{labels.dateLabel}</span>
              <span className="sticky-checkout-bar__value">
                {formatDate(summary.date)} {summary.timeSlot}
              </span>
            </div>
          )}
          <div className="sticky-checkout-bar__row">
            <span className="sticky-checkout-bar__label">{labels.deliveryFeeLabel}</span>
            <span className="sticky-checkout-bar__value">฿{summary.deliveryFee.toLocaleString()}</span>
          </div>
          <div className="sticky-checkout-bar__row sticky-checkout-bar__row--total">
            <span className="sticky-checkout-bar__label">{labels.totalLabel}</span>
            <span className="sticky-checkout-bar__value">฿{summary.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Right: Message above buttons */}
        <div className="sticky-checkout-bar__right">
          <div className="sticky-checkout-bar__message-area" aria-live="polite">
            {orderError ? (
              <p className="sticky-checkout-bar__message sticky-checkout-bar__message--error" role="alert">
                {orderError}
              </p>
            ) : statusMessage ? (
              <p className="sticky-checkout-bar__message sticky-checkout-bar__message--hint">
                {statusMessage}
              </p>
            ) : null}
          </div>
          <div className="sticky-checkout-bar__actions">
          <StickyBarButton
            variant="primary"
            size="md"
            disabled={stripeButtonDisabled}
            loading={stripeLoading}
            lockedVisual={stripeLockedVisual}
            onClick={onPayStripe}
            icon={<Image src="/icons/stripe-v2.svg" alt="" width={16} height={16} className="sticky-bar-btn__icon" />}
            aria-label={stripeDisabled && statusMessage ? labels.completeDetailsToPay : labels.payWithStripe}
            aria-disabled={stripeDisabled}
          >
            {stripeLoading ? labels.redirecting : (stripeDisabled && statusMessage ? labels.completeDetailsToPay : labels.payWithStripe)}
          </StickyBarButton>
          <StickyBarButton
            variant="secondary"
            size="md"
            disabled={bankDisabled}
            loading={bankLoading}
            lockedVisual={bankDisabled && !bankLoading}
            onClick={onPlaceOrder}
            icon={
              <svg className="sticky-bar-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16} aria-hidden>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" />
              </svg>
            }
            aria-label={labels.placeOrder}
            aria-disabled={bankDisabled}
          >
            {placing ? labels.creating : labels.placeOrder}
          </StickyBarButton>
        </div>
        </div>
      </div>

      <style jsx>{`
        .sticky-checkout-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          min-height: ${STICKY_BAR_MIN_HEIGHT}px;
          padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
          background: #fff;
          border-top: 1px solid var(--border);
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: sticky-bar-appear 0.25s ease-out;
        }
        @keyframes sticky-bar-appear {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sticky-checkout-bar__inner {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          min-height: ${BUTTON_HEIGHT + 8}px;
        }
        .sticky-checkout-bar__summary {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .sticky-checkout-bar__row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
        }
        .sticky-checkout-bar__row--total .sticky-checkout-bar__value {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .sticky-checkout-bar__label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .sticky-checkout-bar__value {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
        }
        .sticky-checkout-bar__row--date .sticky-checkout-bar__value {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }
        .sticky-checkout-bar__right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }
        .sticky-checkout-bar__message-area {
          min-height: 0;
          text-align: right;
        }
        .sticky-checkout-bar__message {
          display: block;
          font-size: 0.75rem;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin: 0;
          max-width: 280px;
        }
        .sticky-checkout-bar__message--hint {
          color: var(--text-muted);
        }
        .sticky-checkout-bar__message--error {
          color: #b91c1c;
        }
        .sticky-checkout-bar__actions {
          display: flex;
          flex-direction: row;
          gap: 8px;
          align-items: center;
        }
        @media (max-width: 480px) {
          .sticky-checkout-bar__inner {
            flex-wrap: wrap;
          }
          .sticky-checkout-bar__right {
            width: 100%;
            align-items: stretch;
          }
          .sticky-checkout-bar__message-area {
            text-align: left;
          }
          .sticky-checkout-bar__message {
            max-width: none;
          }
          .sticky-checkout-bar__actions {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

type StickyBarButtonProps = {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md';
  disabled: boolean;
  loading: boolean;
  lockedVisual?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  'aria-label': string;
  'aria-disabled': boolean;
};

function StickyBarButton({
  variant,
  size,
  disabled,
  loading,
  lockedVisual = false,
  onClick,
  icon,
  children,
  'aria-label': ariaLabel,
  'aria-disabled': ariaDisabled,
}: StickyBarButtonProps) {
  const height = size === 'md' ? 44 : 36;

  return (
    <button
      type="button"
      className={`sticky-bar-btn sticky-bar-btn--${variant} sticky-bar-btn--${size} ${disabled ? 'sticky-bar-btn--disabled' : ''} ${lockedVisual ? 'sticky-bar-btn--locked' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={ariaDisabled}
    >
      {!loading && icon}
      <span className="sticky-bar-btn__text">{children}</span>
      <style jsx>{`
        .sticky-bar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: ${height}px;
          min-height: ${height}px;
          padding: 0 14px;
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.2;
          border-radius: 12px;
          cursor: pointer;
          transition: opacity 0.2s, filter 0.2s, background-color 0.2s, border-color 0.2s;
          border: 2px solid transparent;
        }
        .sticky-bar-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .sticky-bar-btn--primary {
          background: #635BFF;
          border-color: #635BFF;
          color: #fff;
        }
        .sticky-bar-btn--primary:hover:not(:disabled) {
          background: #4f46e5;
          border-color: #4f46e5;
        }
        .sticky-bar-btn--secondary {
          background: var(--surface);
          color: var(--text);
          border-color: var(--border);
        }
        .sticky-bar-btn--secondary:hover:not(:disabled) {
          background: var(--pastel-cream);
          border-color: var(--accent);
        }
        .sticky-bar-btn--disabled,
        .sticky-bar-btn:disabled {
          opacity: 0.55;
          filter: grayscale(0.25);
          cursor: not-allowed;
        }
        .sticky-bar-btn--locked:not(:disabled) {
          opacity: 0.75;
          filter: grayscale(0.15);
        }
        .sticky-bar-btn__icon {
          flex-shrink: 0;
          display: block;
        }
        .sticky-bar-btn__text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100px;
        }
        @media (max-width: 400px) {
          .sticky-bar-btn__text {
            max-width: 72px;
          }
        }
      `}</style>
    </button>
  );
}
