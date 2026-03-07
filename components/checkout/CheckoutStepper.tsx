'use client';

import type { Locale } from '@/lib/i18n';

export type CheckoutStep = 1 | 2 | 3;

const STEP_LABELS: Record<Locale, Record<CheckoutStep, string>> = {
  en: {
    1: 'Details',
    2: 'Delivery',
    3: 'Payment',
  },
  th: {
    1: 'ข้อมูลติดต่อ',
    2: 'การจัดส่ง',
    3: 'ชำระเงิน',
  },
};

export interface CheckoutStepperProps {
  lang: Locale;
  currentStep: CheckoutStep;
}

export function CheckoutStepper({ lang, currentStep }: CheckoutStepperProps) {
  const labels = STEP_LABELS[lang];
  return (
    <nav className="checkout-stepper" aria-label="Checkout progress">
      <ol className="checkout-stepper-list" role="list">
        {([1, 2, 3] as const).map((step) => (
          <li
            key={step}
            className={`checkout-stepper-item ${step === currentStep ? 'checkout-stepper-current' : ''} ${step < currentStep ? 'checkout-stepper-done' : ''}`}
            aria-current={step === currentStep ? 'step' : undefined}
          >
            <span className="checkout-stepper-number" aria-hidden>
              {step}
            </span>
            <span className="checkout-stepper-label">{labels[step]}</span>
            {step < 3 && <span className="checkout-stepper-connector" aria-hidden />}
          </li>
        ))}
      </ol>
      <style jsx>{`
        .checkout-stepper {
          margin-bottom: 24px;
        }
        .checkout-stepper-list {
          display: flex;
          align-items: center;
          gap: 0;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .checkout-stepper-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .checkout-stepper-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          background: var(--stone-200, #e7e5e4);
          color: var(--text-muted, #78716c);
          transition: background 0.2s, color 0.2s;
        }
        .checkout-stepper-item.checkout-stepper-current .checkout-stepper-number {
          background: var(--primary, #1a3c34);
          color: white;
        }
        .checkout-stepper-item.checkout-stepper-done .checkout-stepper-number {
          background: var(--primary, #1a3c34);
          color: white;
        }
        .checkout-stepper-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted, #78716c);
        }
        .checkout-stepper-item.checkout-stepper-current .checkout-stepper-label {
          color: var(--text, #1c1917);
        }
        .checkout-stepper-item.checkout-stepper-done .checkout-stepper-label {
          color: var(--text, #1c1917);
        }
        .checkout-stepper-connector {
          width: 24px;
          height: 2px;
          background: var(--stone-200, #e7e5e4);
          margin: 0 4px;
        }
        .checkout-stepper-item.checkout-stepper-done .checkout-stepper-connector {
          background: var(--primary, #1a3c34);
        }
      `}</style>
    </nav>
  );
}
