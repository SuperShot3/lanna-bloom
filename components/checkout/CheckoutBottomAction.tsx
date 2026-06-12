'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export type CheckoutBottomActionProps = {
  lang: Locale;
  /** When set, shows date and time window (e.g. "Today · 09:00–12:00") under the total. */
  deliveryScheduleLine?: string | null;
  total: number;
  deliveryFee: number;
  deliveryFeeGross?: number;
  deliveryFeeKnown: boolean;
  readyToPay: boolean;
  loading: boolean;
  disabled: boolean;
  onAction: () => void;
  labels: {
    continue: string;
    payNow: string;
    deliveryFeeLabel: string;
    deliveryFree: string;
    deliveryFeePending: string;
    policyBefore: string;
    policyDelivery: string;
    policyBetween: string;
    policyRefund: string;
  };
};

export function CheckoutBottomAction({
  lang,
  deliveryScheduleLine,
  total,
  deliveryFee,
  deliveryFeeGross,
  deliveryFeeKnown,
  readyToPay,
  loading,
  disabled,
  onAction,
  labels,
}: CheckoutBottomActionProps) {
  const cta = readyToPay ? labels.payNow : labels.continue;
  const thb = '\u0E3F';
  const regionLabel =
    deliveryScheduleLine && deliveryScheduleLine.trim().length > 0
      ? `${cta}. ${deliveryScheduleLine}`
      : cta;

  return (
    <div className="checkout-bottom-action" role="region" aria-label={regionLabel}>
      <div className="checkout-bottom-action__inner">
        <div className="checkout-bottom-action__price" aria-live="polite">
          <div className="checkout-bottom-action__total-row">
            <span className="checkout-bottom-action__currency">{thb}</span>
            <span className="checkout-bottom-action__total-amount">
              {total.toLocaleString()}
            </span>
          </div>
          {deliveryScheduleLine && deliveryScheduleLine.trim().length > 0 ? (
            <p className="checkout-bottom-action__schedule">{deliveryScheduleLine}</p>
          ) : null}
          <p className="checkout-bottom-action__delivery-meta">
            {labels.deliveryFeeLabel}{' '}
            {!deliveryFeeKnown ? (
              labels.deliveryFeePending
            ) : deliveryFeeGross != null && deliveryFeeGross > deliveryFee ? (
              <>
                <span className="checkout-bottom-action__delivery-was">
                  {thb}
                  {deliveryFeeGross.toLocaleString()}
                </span>{' '}
                {labels.deliveryFree}
              </>
            ) : (
              <>
                {thb}
                {deliveryFee.toLocaleString()}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className={`checkout-bottom-action__btn${readyToPay ? ' checkout-bottom-action__btn--pay' : ''}`}
          onClick={onAction}
          disabled={disabled || loading}
          aria-busy={loading}
        >
          {loading ? '\u2026' : cta}
        </button>
      </div>
      <p className="checkout-bottom-action__policy">
        {labels.policyBefore}{' '}
        <Link href={`/${lang}/info/delivery-policy`} className="checkout-bottom-action__policy-link">
          {labels.policyDelivery}
        </Link>{' '}
        {labels.policyBetween}{' '}
        <Link href={`/${lang}/refund-replacement`} className="checkout-bottom-action__policy-link">
          {labels.policyRefund}
        </Link>
        {lang === 'en' ? '.' : ''}
      </p>
      <style jsx>{`
        .checkout-bottom-action {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 60;
          padding: 12px 16px calc(14px + env(safe-area-inset-bottom, 0px));
          background: rgba(255, 252, 248, 0.86);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          box-sizing: border-box;
        }
        .checkout-bottom-action__inner {
          max-width: 560px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .checkout-bottom-action__price {
          flex: 1;
          min-width: 0;
        }
        .checkout-bottom-action__total-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
        .checkout-bottom-action__currency {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .checkout-bottom-action__total-amount {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text);
          line-height: 1.15;
        }
        .checkout-bottom-action__schedule {
          margin: 4px 0 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.25;
        }
        .checkout-bottom-action__delivery-meta {
          margin: 2px 0 0;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          line-height: 1.3;
        }
        .checkout-bottom-action__delivery-was {
          text-decoration: line-through;
          opacity: 0.65;
        }
        .checkout-bottom-action__btn {
          flex-shrink: 0;
          min-height: 48px;
          padding: 0 22px;
          border: none;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          background: color-mix(in srgb, var(--primary) 88%, #000);
          color: #fff;
          transition: transform 0.15s, opacity 0.2s;
        }
        .checkout-bottom-action__btn--pay {
          background: var(--primary);
          min-width: 132px;
        }
        @media (max-width: 360px) {
          .checkout-bottom-action__btn {
            line-height: 1.15;
            white-space: normal;
            padding: 8px 14px;
          }
          .checkout-bottom-action__btn--pay {
            min-width: min(132px, 42vw);
          }
        }
        .checkout-bottom-action__btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .checkout-bottom-action__btn:not(:disabled):active {
          transform: scale(0.97);
        }
        .checkout-bottom-action__policy {
          max-width: 560px;
          margin: 8px auto 0;
          font-size: 10px;
          line-height: 1.35;
          color: var(--text-muted);
          text-align: center;
        }
        .checkout-bottom-action__policy-link {
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
        }
        .checkout-bottom-action__policy-link:hover {
          text-decoration: underline;
        }
        @media (min-width: 900px) {
          .checkout-bottom-action {
            position: sticky;
            margin-top: 24px;
            border-radius: 16px;
            border: 1px solid rgba(0, 0, 0, 0.06);
            box-shadow: 0 4px 24px rgba(26, 60, 52, 0.06);
          }
        }
      `}</style>
    </div>
  );
}
