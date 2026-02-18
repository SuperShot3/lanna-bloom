'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function PaymentBadges({ lang }: { lang: Locale }) {
  const label = translations[lang].acceptedPayments ?? 'Accepted payments';

  return (
    <div className="payment-badges" aria-label="Accepted payment methods">
      <span className="payment-badges-label">{label}</span>
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
          gap: 8px;
          width: 100%;
          max-width: 100%;
        }
        .payment-badges-label {
          font-size: 12px;
          color: var(--text-muted);
          opacity: 0.85;
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
        @media (max-width: 480px) {
          .payment-badges-row {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
