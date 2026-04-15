'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { PaymentMethodsAvailability } from '@/lib/checkout/paymentAvailability';
import { DELIVERY_TIME_SLOTS } from '@/components/DeliveryForm';
import { getLocalTodayYmd, getLocalTomorrowYmd } from '@/lib/localDateYmd';

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
  /** When true, shows the compact Stripe shortcut next to Place order. */
  showStripeButton?: boolean;
  placingStripe?: boolean;
  onPayStripe?: () => void;
  onPlaceOrder: () => void;
  /** Optional: scroll to delivery section when user clicks Change (used when no inline edit). */
  onDateChange?: () => void;
  /** When set, "Change" opens an inline edit sheet; on confirm this is called with (date, timeSlot). */
  onDeliveryDateTimeChange?: (date: string, timeSlot: string) => void;
  formatDate?: (dateStr: string) => string;
  labels: {
    dateLabel: string;
    deliveryFeeLabel: string;
    totalLabel: string;
    payWithStripe?: string;
    completeDetailsToPay?: string;
    placeOrder: string;
    orderLabel: string;
    redirecting: string;
    creating: string;
    unavailableRightNow: string;
    change?: string;
    delivery?: string;
    showCheckout?: string;
    /** Inline edit sheet */
    specifyDeliveryDate?: string;
    todayLabel?: string;
    tomorrowLabel?: string;
    selectTimeSlot?: string;
    preferredTime?: string;
    save?: string;
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
  showStripeButton = false,
  placingStripe = false,
  onPayStripe,
  onPlaceOrder,
  onDateChange,
  onDeliveryDateTimeChange,
  formatDate = (d) => d,
  labels,
}: StickyBarProps) {
  const stripeDisabled = !availability.stripe.enabled;
  /** Primary checkout CTA (Stripe) uses same availability as the optional Stripe shortcut. */
  const checkoutDisabled = !availability.stripe.enabled;
  const stripeLoading = placingStripe;
  const checkoutLoading = placing;
  const stripeButtonDisabled = stripeLoading;
  const stripeLockedVisual = stripeDisabled && !stripeLoading;
  const checkoutLockedVisual = checkoutDisabled && !checkoutLoading;
  const stripeReady = !stripeDisabled && !stripeLoading;
  const checkoutReady = !checkoutDisabled && !checkoutLoading;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState('');
  const touchStartY = useRef(0);

  const minDate = getLocalTodayYmd();
  const tomorrowQuickStr = getLocalTomorrowYmd();
  const timeSlots = DELIVERY_TIME_SLOTS;

  const openEditSheet = useCallback(() => {
    const date = summary.date && /^\d{4}-\d{2}-\d{2}$/.test(summary.date) && summary.date >= minDate
      ? summary.date
      : minDate;
    const timeSlot = summary.timeSlot && timeSlots.includes(summary.timeSlot as typeof timeSlots[number])
      ? summary.timeSlot
      : timeSlots[0];
    setEditDate(date);
    setEditTimeSlot(timeSlot);
    setEditSheetOpen(true);
  }, [summary.date, summary.timeSlot, minDate, timeSlots]);

  useEffect(() => {
    if (!editSheetOpen) return;
    const date = summary.date && /^\d{4}-\d{2}-\d{2}$/.test(summary.date) && summary.date >= minDate
      ? summary.date
      : minDate;
    const timeSlot = summary.timeSlot && timeSlots.includes(summary.timeSlot as typeof timeSlots[number])
      ? summary.timeSlot
      : timeSlots[0];
    setEditDate(date);
    setEditTimeSlot(timeSlot);
  }, [editSheetOpen, summary.date, summary.timeSlot, minDate, timeSlots]);

  const handleEditConfirm = useCallback(() => {
    const date = editDate && editDate >= minDate ? editDate : minDate;
    const slot = timeSlots.includes(editTimeSlot as typeof timeSlots[number]) ? editTimeSlot : timeSlots[0];
    onDeliveryDateTimeChange?.(date, slot);
    setEditSheetOpen(false);
  }, [editDate, editTimeSlot, minDate, timeSlots, onDeliveryDateTimeChange]);

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

  const handleChangeClick = useCallback(() => {
    if (onDeliveryDateTimeChange) {
      openEditSheet();
    } else {
      onDateChange?.();
    }
  }, [onDeliveryDateTimeChange, onDateChange, openEditSheet]);

  const dateDisplay =
    summary.date && summary.timeSlot
      ? `${formatDate(summary.date)} · ${summary.timeSlot}`
      : summary.date
        ? formatDate(summary.date)
        : summary.timeSlot ?? null;

  const hintMessage = orderError ?? incompleteHint ?? null;
  const isHintError = Boolean(orderError);

  const [hintDisplay, setHintDisplay] = useState<{ text: string; isError: boolean } | null>(() =>
    hintMessage ? { text: hintMessage, isError: isHintError } : null
  );
  const [hintAnimOpen, setHintAnimOpen] = useState(() => Boolean(hintMessage));

  useEffect(() => {
    if (!hintMessage) {
      setHintAnimOpen(false);
      return;
    }
    setHintDisplay({ text: hintMessage, isError: isHintError });
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHintAnimOpen(true));
    });
    return () => cancelAnimationFrame(id);
  }, [hintMessage, isHintError]);

  const handleHintSlotTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'max-height') return;
    if (!hintAnimOpen && !hintMessage) {
      setHintDisplay(null);
    }
  }, [hintAnimOpen, hintMessage]);

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
        <div className="sticky-checkout-bar__top-block">
          <div
            className="sticky-checkout-bar__handle-wrap"
            aria-hidden
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="sticky-checkout-bar__handle" />
          </div>

          {/* Hint row: wrapper always in DOM; margin-top animates with height so removing inner never changes flex gap (avoids end jump) */}
          <div
            className={`sticky-checkout-bar__hint-slot ${hintAnimOpen ? 'sticky-checkout-bar__hint-slot--visible' : ''}`}
            onTransitionEnd={handleHintSlotTransitionEnd}
          >
            {hintDisplay && (
              <div className="sticky-checkout-bar__hint-inner">
                <span className="sticky-checkout-bar__hint-icon" aria-hidden>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="13" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <p
                  className={`sticky-checkout-bar__hint ${hintDisplay.isError ? 'sticky-checkout-bar__hint--error' : ''}`}
                  role={hintDisplay.isError ? 'alert' : undefined}
                  aria-live="polite"
                >
                  {hintDisplay.text}
                </p>
              </div>
            )}
          </div>
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
          {(onDateChange || onDeliveryDateTimeChange) && (
            <button
              type="button"
              className="sticky-checkout-bar__date-change"
              onClick={handleChangeClick}
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

          {showStripeButton && (
            <div
              role="button"
              tabIndex={stripeButtonDisabled ? -1 : 0}
              className={`sticky-checkout-bar__btn-stripe ${stripeButtonDisabled ? 'sticky-checkout-bar__btn-stripe--disabled' : ''} ${stripeLockedVisual ? 'sticky-checkout-bar__btn-stripe--locked' : ''} ${stripeLoading ? 'sticky-checkout-bar__btn-stripe--loading' : ''} ${stripeReady ? 'sticky-checkout-bar__btn-stripe--ready' : ''}`}
              onClick={stripeButtonDisabled ? undefined : onPayStripe}
              onKeyDown={(e) => {
                if (!stripeButtonDisabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onPayStripe?.();
                }
              }}
              aria-label={
                stripeDisabled && incompleteHint
                  ? labels.completeDetailsToPay ?? 'Complete details to pay'
                  : labels.payWithStripe ?? 'Pay now'
              }
              aria-busy={stripeLoading}
              aria-disabled={stripeDisabled}
              title={labels.payWithStripe ?? 'Pay now'}
            >
              <span className="sticky-checkout-bar__stripe-s" aria-hidden>S</span>
            </div>
          )}

          <button
            type="button"
            className={`sticky-checkout-bar__btn-order ${checkoutLockedVisual ? 'sticky-checkout-bar__btn-order--locked' : ''} ${checkoutReady ? 'sticky-checkout-bar__btn-order--ready' : ''} ${checkoutLoading ? 'sticky-checkout-bar__btn-order--loading' : ''}`}
            onClick={onPlaceOrder}
            disabled={checkoutDisabled || checkoutLoading}
            aria-label={labels.placeOrder}
            aria-busy={checkoutLoading}
            aria-disabled={checkoutDisabled}
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
            {checkoutLoading ? labels.creating : labels.orderLabel}
          </button>
        </div>
      </div>
      )}

      {/* Mobile: bottom sheet to edit delivery date & time */}
      {editSheetOpen && onDeliveryDateTimeChange && (
        <>
          <div
            className="sticky-checkout-bar__sheet-backdrop"
            role="presentation"
            aria-hidden
            onClick={() => setEditSheetOpen(false)}
          />
          <div
            className="sticky-checkout-bar__sheet"
            role="dialog"
            aria-modal="true"
            aria-label={labels.delivery ?? 'Delivery'}
          >
            <div className="sticky-checkout-bar__sheet-handle" aria-hidden />
            <h3 className="sticky-checkout-bar__sheet-title">
              {labels.delivery ?? 'Delivery'}
            </h3>
            <div className="sticky-checkout-bar__sheet-field">
              <label className="sticky-checkout-bar__sheet-label" htmlFor="sticky-edit-date">
                {labels.specifyDeliveryDate ?? 'Specify delivery date'}
              </label>
              <input
                id="sticky-edit-date"
                type="date"
                value={editDate}
                min={minDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="sticky-checkout-bar__sheet-date"
                aria-label={labels.specifyDeliveryDate ?? 'Delivery date'}
              />
              <div className="sticky-checkout-bar__sheet-quick">
                <button
                  type="button"
                  className={`sticky-checkout-bar__sheet-quick-btn${editDate === minDate ? ' sticky-checkout-bar__sheet-quick-btn--active' : ''}`}
                  onClick={() => setEditDate(minDate)}
                  aria-pressed={editDate === minDate}
                >
                  {labels.todayLabel ?? 'Today'}
                </button>
                <button
                  type="button"
                  className={`sticky-checkout-bar__sheet-quick-btn${editDate === tomorrowQuickStr ? ' sticky-checkout-bar__sheet-quick-btn--active' : ''}`}
                  onClick={() => setEditDate(tomorrowQuickStr)}
                  aria-pressed={editDate === tomorrowQuickStr}
                >
                  {labels.tomorrowLabel ?? 'Tomorrow'}
                </button>
              </div>
            </div>
            <div className="sticky-checkout-bar__sheet-field">
              <label className="sticky-checkout-bar__sheet-label" htmlFor="sticky-edit-time">
                {labels.preferredTime ?? labels.selectTimeSlot ?? 'Time slot'}
              </label>
              <select
                id="sticky-edit-time"
                value={editTimeSlot}
                onChange={(e) => setEditTimeSlot(e.target.value)}
                className="sticky-checkout-bar__sheet-select"
                aria-label={labels.selectTimeSlot ?? 'Select time slot'}
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="sticky-checkout-bar__sheet-save"
              onClick={handleEditConfirm}
            >
              {labels.save ?? (lang === 'th' ? 'บันทึก' : 'Save')}
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .sticky-checkout-bar {
          /* Left inset for text/icons so rows share one vertical edge (matches date-row inner padding). */
          --sticky-bar-content-inset: 10px;
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 420px;
          z-index: 50;
          background: rgba(253, 252, 248, 0.92);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -3px 20px rgba(26, 60, 52, 0.08);
          padding: 8px 14px calc(20px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: sticky-bar-slideUp 0.42s cubic-bezier(0.33, 1, 0.68, 1) both;
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
        .sticky-checkout-bar__top-block {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .sticky-checkout-bar__hint-slot {
          max-height: 0;
          margin-top: 0;
          opacity: 0;
          overflow: hidden;
          flex-shrink: 0;
          transform: translateZ(0);
          transition:
            max-height 0.58s cubic-bezier(0.22, 1, 0.36, 1),
            margin-top 0.58s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.58s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sticky-checkout-bar__hint-slot--visible {
          max-height: 56px;
          margin-top: 5px;
          opacity: 1;
        }
        .sticky-checkout-bar__hint-inner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 2px 2px 0 var(--sticky-bar-content-inset);
          min-height: 22px;
        }
        @media (prefers-reduced-motion: reduce) {
          .sticky-checkout-bar__hint-slot {
            transition-duration: 0.01ms;
          }
        }
        .sticky-checkout-bar__hint-icon {
          flex-shrink: 0;
          color: #b91c1c;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.5px;
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
          background: var(--border);
        }
        .sticky-checkout-bar__date-row {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--pastel-cream);
          border-radius: 10px;
          padding: 7px 10px 7px var(--sticky-bar-content-inset);
        }
        .sticky-checkout-bar__date-icon {
          flex-shrink: 0;
          color: var(--primary);
        }
        .sticky-checkout-bar__date-sub {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .sticky-checkout-bar__date-value {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticky-checkout-bar__date-change {
          font-size: 11px;
          font-weight: 600;
          color: var(--primary);
          background: var(--pastel-mint);
          padding: 3px 9px;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
          font-family: inherit;
        }
        .sticky-checkout-bar__date-change:hover {
          background: #d4e6df;
        }
        .sticky-checkout-bar__bottom-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sticky-checkout-bar__price-block {
          flex: 1;
          min-width: 0;
          padding-left: var(--sticky-bar-content-inset);
        }
        .sticky-checkout-bar__price-meta {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-muted);
          line-height: 1;
          margin-bottom: 2px;
        }
        .sticky-checkout-bar__price-meta span {
          color: var(--text-muted);
          font-weight: 600;
        }
        .sticky-checkout-bar__total-amount {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
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
          background: var(--primary);
          box-shadow: 0 3px 12px rgba(26, 60, 52, 0.3);
        }
        .sticky-checkout-bar__btn-order--ready:hover:not(:disabled) {
          background: #153029;
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
          flex: 1;
          min-width: 0;
          font-size: 10px;
          font-weight: 500;
          color: #b91c1c;
          line-height: 1.35;
          margin: 0;
          padding: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
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
          background: color-mix(in srgb, var(--bg) 92%, transparent);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border: none;
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -3px 20px rgba(26, 60, 52, 0.08);
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          transition: background 0.15s;
        }
        .sticky-checkout-bar__peek:hover {
          background: color-mix(in srgb, var(--bg) 95%, transparent);
        }
        .sticky-checkout-bar__peek:active {
          background: color-mix(in srgb, var(--bg) 98%, transparent);
        }
        .sticky-checkout-bar__peek-chevron {
          flex-shrink: 0;
          color: var(--accent);
        }
        .sticky-checkout-bar--collapsed .sticky-checkout-bar__peek {
          display: flex;
        }

        /* Delivery date/time edit sheet (mobile) */
        .sticky-checkout-bar__sheet-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 49;
          animation: sticky-sheet-fadeIn 0.24s ease-in-out;
        }
        @keyframes sticky-sheet-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .sticky-checkout-bar__sheet {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 0;
          width: 100%;
          max-width: 420px;
          max-height: 70vh;
          z-index: 51;
          background: var(--bg);
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
          padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
          animation: sticky-sheet-slideUp 0.36s cubic-bezier(0.33, 1, 0.68, 1);
        }
        @keyframes sticky-sheet-slideUp {
          from { transform: translateX(-50%) translateY(100%); }
          to { transform: translateX(-50%) translateY(0); }
        }
        .sticky-checkout-bar__sheet-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          margin: 0 auto 12px;
        }
        .sticky-checkout-bar__sheet-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 16px;
        }
        .sticky-checkout-bar__sheet-field {
          margin-bottom: 14px;
        }
        .sticky-checkout-bar__sheet-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .sticky-checkout-bar__sheet-date {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          color: var(--text);
          background: var(--surface);
        }
        .sticky-checkout-bar__sheet-quick {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .sticky-checkout-bar__sheet-quick-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid color-mix(in srgb, var(--accent-secondary) 52%, var(--border));
          background: color-mix(in srgb, var(--accent-soft) 58%, var(--pastel-cream));
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .sticky-checkout-bar__sheet-quick-btn:hover {
          background: color-mix(in srgb, var(--accent-soft) 78%, var(--pastel-cream));
          border-color: color-mix(in srgb, var(--accent) 38%, var(--border));
        }
        .sticky-checkout-bar__sheet-quick-btn--active {
          background: color-mix(in srgb, var(--pastel-pink) 88%, var(--pastel-cream));
          color: var(--text);
          border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
          font-weight: 600;
        }
        .sticky-checkout-bar__sheet-quick-btn--active:hover {
          background: color-mix(in srgb, var(--pastel-pink) 92%, white);
          border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
        }
        .sticky-checkout-bar__sheet-select {
          width: 100%;
          padding: 10px 12px;
          padding-right: 36px;
          background-position: right 10px center;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          color: var(--text);
          background: var(--surface);
        }
        .sticky-checkout-bar__sheet-save {
          width: 100%;
          margin-top: 8px;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: var(--primary);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .sticky-checkout-bar__sheet-save:hover {
          background: #153029;
        }
      `}</style>
    </div>
  );
}
