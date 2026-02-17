'use client';

import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/**
 * Payment method config.
 * Replace placeholder SVGs in /public/payments/ with official brand assets when available.
 * Sources: Visa (usa.visa.com), Mastercard (brand.mastercard.com), etc.
 */
const PAYMENT_METHODS = [
  { id: 'visa', file: 'visa.svg', alt: 'Visa' },
  { id: 'mastercard', file: 'mastercard.svg', alt: 'Mastercard' },
  { id: 'jcb', file: 'jcb.svg', alt: 'JCB' },
  { id: 'unionpay', file: 'unionpay.svg', alt: 'UnionPay' },
  { id: 'amex', file: 'amex.svg', alt: 'American Express' },
  { id: 'promptpay', file: 'promptpay.svg', alt: 'PromptPay' },
  { id: 'thai-qr', file: 'thai-qr.svg', alt: 'Thai QR Payment' },
] as const;

export function PaymentBadges({ lang }: { lang: Locale }) {
  const label = translations[lang].acceptedPayments ?? 'Accepted payments';

  return (
    <div className="payment-badges" aria-label="Accepted payment methods">
      <span className="payment-badges-label">{label}</span>
      <div className="payment-badges-row">
        {PAYMENT_METHODS.map(({ id, file, alt }) => (
          <span key={id} className="payment-badges-badge">
            <img
              src={`/payments/${file}`}
              alt={alt}
              className="payment-badges-icon"
              loading="lazy"
              decoding="async"
            />
          </span>
        ))}
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
        .payment-badges-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .payment-badges-icon {
          height: 22px;
          width: auto;
          display: block;
          object-fit: contain;
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
