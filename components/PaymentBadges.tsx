'use client';

import type { Locale } from '@/lib/i18n';

export function PaymentBadges({ lang, compact }: { lang: Locale; compact?: boolean }) {
  return (
    <div className={`payment-badges ${compact ? 'payment-badges-compact' : ''}`} aria-label="Accepted payment methods">
      <div className="payment-badges-row">
        <img
          src="/payments/stripe-cc-payments1.png"
          alt="Visa, Mastercard, American Express, and other cards"
          className="payment-badges-icon payment-badges-single"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/payments/Thai_QR_Logo.svg"
          alt="Thai PromptPay QR"
          className="payment-badges-icon payment-badges-thaiqr"
          loading="lazy"
          decoding="async"
        />
      </div>
      <style jsx>{`
        .payment-badges {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 100%;
        }
        .payment-badges-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 10px;
          min-height: 34px;
        }
        .payment-badges-icon {
          height: 22px;
          width: auto;
          display: block;
          object-fit: contain;
        }
        .payment-badges-single {
          height: 28px;
          max-width: 100%;
        }
        .payment-badges-thaiqr {
          height: 24px;
          width: auto;
        }
        .payment-badges-compact .payment-badges-row {
          min-height: 0;
        }
        .payment-badges-compact .payment-badges-icon,
        .payment-badges-compact .payment-badges-single,
        .payment-badges-compact .payment-badges-thaiqr {
          width: 40px;
          height: 40px;
        }
        @media (max-width: 480px) {
          .payment-badges-row {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
