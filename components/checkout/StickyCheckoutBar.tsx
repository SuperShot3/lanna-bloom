'use client';

import { useState, useRef, useCallback } from 'react';
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
  /** Shown below bar when form incomplete – small red text. */
  incompleteHint?: string | null;
  orderError?: string | null;
  placing: boolean;
  placingStripe: boolean;
  onPayStripe: () => void;
  onPlaceOrder: () => void;
  /** Optional: scroll to delivery section when user clicks Change on date. */
  onDateChange?: () => void;
  formatDate?: (dateStr: string) => string;
  labels: {
    dateLabel: string;
    deliveryFeeLabel: string;
    totalLabel: string;
    payWithStripe: string;
    completeDetailsToPay: string;
    placeOrder: string;
    orderLabel: string;
    redirecting: string;
    creating: string;
    unavailableRightNow: string;
    change?: string;
    delivery?: string;
    showCheckout?: string;
  };
};

const BUTTON_HEIGHT = 48;

export function StickyCheckoutBar({
  lang,
  summary,
  availability,
  incompleteHint,
  orderError,
  placing,
  placingStripe,
  onPayStripe,
  onPlaceOrder,
  onDateChange,
  formatDate = (d) => d,
  labels,
}: StickyBarProps) {
  const stripeDisabled = !availability.stripe.enabled;
  const bankDisabled = !availability.bankTransfer.enabled;
  const stripeLoading = placingStripe;
  const bankLoading = placing;
  const stripeButtonDisabled = stripeLoading;
  const stripeLockedVisual = stripeDisabled && !stripeLoading;
  const bankLockedVisual = bankDisabled && !bankLoading;
  const stripeReady = !stripeDisabled && !stripeLoading;
  const bankReady = !bankDisabled && !bankLoading;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    if (deltaY > 50) {
      setIsCollapsed(true);
    }
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const dateDisplay =
    summary.date && summary.timeSlot
      ? `${formatDate(summary.date)} · ${summary.timeSlot}`
      : summary.date
        ? formatDate(summary.date)
        : summary.timeSlot ?? null;

  return (
    <div
      className={`sticky-checkout-bar ${isCollapsed ? 'sticky-checkout-bar--collapsed' : ''}`}
      role="region"
      aria-label={lang === 'th' ? 'ชำระเงิน' : 'Checkout'}
    >
      {isCollapsed ? (
        <button
          type="button"
          className="sticky-checkout-bar__peek"
          onClick={handleExpand}
          aria-label={labels.showCheckout ?? (lang === 'th' ? 'แสดงชำระเงิน' : 'Show checkout')}
        >
          <span className="sticky-checkout-bar__peek-total">฿{summary.total.toLocaleString()}</span>
          <svg className="sticky-checkout-bar__peek-chevron" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
      <div className="sticky-checkout-bar__inner">
        <div
          className="sticky-checkout-bar__handle-wrap"
          aria-hidden
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="sticky-checkout-bar__handle" />
        </div>

        {/* Date row */}
        <div className="sticky-checkout-bar__date-row">
          <svg
            className="sticky-checkout-bar__date-icon"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="sticky-checkout-bar__date-sub">
            {labels.delivery ?? 'Delivery'}
          </span>
          <span className="sticky-checkout-bar__date-value">
            {dateDisplay ?? (lang === 'th' ? 'เลือกวันที่และเวลา' : 'Select date & time')}
          </span>
          {onDateChange && (
            <button
              type="button"
              className="sticky-checkout-bar__date-change"
              onClick={onDateChange}
              aria-label={labels.change ?? 'Change'}
            >
              {labels.change ?? 'Change'}
            </button>
          )}
        </div>

        {/* Bottom row: price + Stripe + Order */}
        <div className="sticky-checkout-bar__bottom-row">
          <div className="sticky-checkout-bar__price-block">
            <div className="sticky-checkout-bar__price-meta">
              {labels.totalLabel} · {labels.deliveryFeeLabel}{' '}
              <span>฿{summary.deliveryFee.toLocaleString()}</span>
            </div>
            <div className="sticky-checkout-bar__total-amount">
              ฿{summary.total.toLocaleString()}
            </div>
          </div>

          <div
            role="button"
            tabIndex={stripeButtonDisabled ? -1 : 0}
            className={`sticky-checkout-bar__btn-stripe ${stripeButtonDisabled ? 'sticky-checkout-bar__btn-stripe--disabled' : ''} ${stripeLockedVisual ? 'sticky-checkout-bar__btn-stripe--locked' : ''} ${stripeLoading ? 'sticky-checkout-bar__btn-stripe--loading' : ''} ${stripeReady ? 'sticky-checkout-bar__btn-stripe--ready' : ''}`}
            onClick={stripeButtonDisabled ? undefined : onPayStripe}
            onKeyDown={(e) => {
              if (!stripeButtonDisabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onPayStripe();
              }
            }}
            aria-label={stripeDisabled && incompleteHint ? labels.completeDetailsToPay : labels.payWithStripe}
            aria-busy={stripeLoading}
            aria-disabled={stripeDisabled}
            title={labels.payWithStripe}
          >
            <span className="sticky-checkout-bar__stripe-s" aria-hidden>S</span>
          </div>

          <button
            type="button"
            className={`sticky-checkout-bar__btn-order ${bankLockedVisual ? 'sticky-checkout-bar__btn-order--locked' : ''} ${bankReady ? 'sticky-checkout-bar__btn-order--ready' : ''} ${bankLoading ? 'sticky-checkout-bar__btn-order--loading' : ''}`}
            onClick={onPlaceOrder}
            disabled={bankDisabled || bankLoading}
            aria-label={labels.placeOrder}
            aria-busy={bankLoading}
            aria-disabled={bankDisabled}
          >
            <svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {bankLoading ? labels.creating : labels.orderLabel}
          </button>
        </div>

        {/* Small red hint when something is missing */}
        {(incompleteHint || orderError) && (
          <p
            className={`sticky-checkout-bar__hint ${orderError ? 'sticky-checkout-bar__hint--error' : ''}`}
            role={orderError ? 'alert' : undefined}
            aria-live="polite"
          >
            {orderError ?? incompleteHint}
          </p>
        )}
      </div>
      )}

      <style jsx>{`
        .sticky-checkout-bar {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 420px;
          z-index: 50;
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -3px 20px rgba(0, 0, 0, 0.09);
          padding: 8px 14px calc(20px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: sticky-bar-slideUp 0.35s cubic-bezier(0.22, 0.68, 0, 1.2) both;
          box-sizing: border-box;
        }
        @keyframes sticky-bar-slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        .sticky-checkout-bar__inner {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sticky-checkout-bar__handle-wrap {
          padding: 10px 20px;
          margin: -10px -20px 2px;
          cursor: grab;
          display: flex;
          justify-content: center;
        }
        .sticky-checkout-bar__handle {
          width: 32px;
          height: 3px;
          border-radius: 2px;
          background: #e2e2e2;
        }
        .sticky-checkout-bar__date-row {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f7f7f7;
          border-radius: 10px;
          padding: 7px 10px;
        }
        .sticky-checkout-bar__date-icon {
          flex-shrink: 0;
          color: #5b9e6e;
        }
        .sticky-checkout-bar__date-sub {
          font-size: 10px;
          font-weight: 500;
          color: #aaa;
        }
        .sticky-checkout-bar__date-value {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticky-checkout-bar__date-change {
          font-size: 11px;
          font-weight: 600;
          color: #5b9e6e;
          background: #eef7f1;
          padding: 3px 9px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
          font-family: inherit;
        }
        .sticky-checkout-bar__date-change:hover {
          background: #d8f0e2;
        }
        .sticky-checkout-bar__bottom-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sticky-checkout-bar__price-block {
          flex: 1;
          min-width: 0;
        }
        .sticky-checkout-bar__price-meta {
          font-size: 10px;
          font-weight: 500;
          color: #aaa;
          line-height: 1;
          margin-bottom: 2px;
        }
        .sticky-checkout-bar__price-meta span {
          color: #888;
          font-weight: 600;
        }
        .sticky-checkout-bar__total-amount {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.5px;
          line-height: 1.15;
        }
        .sticky-checkout-bar__btn-stripe {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #635bff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(99, 91, 255, 0.28);
          transition: transform 0.15s, opacity 0.2s, filter 0.2s;
          position: relative;
        }
        .sticky-checkout-bar__btn-stripe:not(.sticky-checkout-bar__btn-stripe--disabled):active {
          transform: scale(0.94);
        }
        .sticky-checkout-bar__btn-stripe--ready {
          background: #635bff;
          box-shadow: 0 3px 10px rgba(99, 91, 255, 0.28);
        }
        .sticky-checkout-bar__btn-stripe--locked:not(.sticky-checkout-bar__btn-stripe--loading) {
          opacity: 0.6;
          filter: grayscale(0.4);
          background: #9ca3af;
        }
        .sticky-checkout-bar__btn-stripe--disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .sticky-checkout-bar__stripe-s {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }
        .sticky-checkout-bar__btn-stripe--loading .sticky-checkout-bar__stripe-s {
          visibility: hidden;
        }
        .sticky-checkout-bar__btn-stripe--loading::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          margin: -8px 0 0 -8px;
          width: 16px;
          height: 16px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: sticky-stripe-spin 0.6s linear infinite;
        }
        @keyframes sticky-stripe-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .sticky-checkout-bar__btn-stripe:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .sticky-checkout-bar__btn-order {
          flex-shrink: 0;
          height: ${BUTTON_HEIGHT}px;
          padding: 0 20px;
          border-radius: 14px;
          background: #9ca3af;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          box-shadow: 0 3px 12px rgba(156, 163, 175, 0.3);
          transition: transform 0.15s, background 0.2s, box-shadow 0.2s;
          white-space: nowrap;
          position: relative;
        }
        .sticky-checkout-bar__btn-order:active:not(:disabled) {
          transform: scale(0.96);
        }
        .sticky-checkout-bar__btn-order--ready {
          background: #5b9e6e;
          box-shadow: 0 3px 12px rgba(91, 158, 110, 0.3);
        }
        .sticky-checkout-bar__btn-order--ready:hover:not(:disabled) {
          background: #4a8d5c;
        }
        .sticky-checkout-bar__btn-order--locked:not(.sticky-checkout-bar__btn-order--loading) {
          opacity: 0.75;
          filter: grayscale(0.2);
        }
        .sticky-checkout-bar__btn-order--loading {
          cursor: wait;
        }
        .sticky-checkout-bar__btn-order--loading svg {
          visibility: hidden;
        }
        .sticky-checkout-bar__btn-order--loading::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          margin: -8px 0 0 -8px;
          width: 16px;
          height: 16px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: sticky-stripe-spin 0.6s linear infinite;
        }
        .sticky-checkout-bar__btn-order:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .sticky-checkout-bar__hint {
          font-size: 10px;
          font-weight: 500;
          color: #b91c1c;
          line-height: 1.3;
          margin: 0;
          padding: 0 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sticky-checkout-bar__hint--error {
          font-weight: 600;
        }
        /* Mobile: swipe down to collapse, click peek to expand */
        @media (min-width: 1201px) {
          .sticky-checkout-bar__handle-wrap {
            pointer-events: none;
            cursor: default;
          }
        }
        .sticky-checkout-bar--collapsed .sticky-checkout-bar__inner {
          display: none;
        }
        .sticky-checkout-bar__peek {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border: none;
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -3px 20px rgba(0, 0, 0, 0.09);
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          transition: background 0.15s;
        }
        .sticky-checkout-bar__peek:hover {
          background: rgba(255, 255, 255, 0.85);
        }
        .sticky-checkout-bar__peek:active {
          background: rgba(255, 255, 255, 0.9);
        }
        .sticky-checkout-bar__peek-chevron {
          flex-shrink: 0;
          color: #5b9e6e;
        }
        .sticky-checkout-bar--collapsed .sticky-checkout-bar__peek {
          display: flex;
        }
      `}</style>
    </div>
  );
}
