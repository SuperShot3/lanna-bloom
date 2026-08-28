'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { formatCountdown } from '@/lib/conversionDiscount/eligibility';

export function DiscountTimerPill({
  lang,
  remainingMs,
  liftForCart,
  liftForPdp,
  onOpen,
  onDismiss,
}: {
  lang: Locale;
  remainingMs: number;
  liftForCart: boolean;
  liftForPdp: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const t = translations[lang].conversionDiscount ?? translations.en.conversionDiscount;
  const countdown = formatCountdown(remainingMs);
  const aria = (t.pillAria ?? 'Limited-time 10% off, {time} remaining').replace('{time}', countdown);
  const liftClass = liftForCart
    ? 'intent-discount-pill--cart'
    : liftForPdp
      ? 'intent-discount-pill--pdp'
      : '';

  return (
    <div className={`intent-discount-pill ${liftClass}`}>
      <button type="button" className="intent-discount-pill__main" onClick={onOpen} aria-label={aria}>
        <span className="intent-discount-pill__label">{t.pillLabel}</span>
        <span className="intent-discount-pill__dot" aria-hidden>
          ·
        </span>
        <span className="intent-discount-pill__time">{countdown}</span>
      </button>
      <button
        type="button"
        className="intent-discount-pill__dismiss"
        onClick={onDismiss}
        aria-label={t.pillDismiss}
      >
        <Cross2Icon width={12} height={12} />
      </button>
      <style jsx>{`
        .intent-discount-pill {
          position: fixed;
          z-index: 100;
          left: 12px;
          bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          display: inline-flex;
          align-items: center;
          gap: 2px;
          pointer-events: none;
        }
        @media (min-width: 768px) {
          .intent-discount-pill {
            left: 24px;
            bottom: 24px;
          }
        }
        .intent-discount-pill--pdp {
          bottom: calc(96px + env(safe-area-inset-bottom, 0px));
        }
        .intent-discount-pill--cart {
          bottom: calc(7.25rem + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 768px) {
          .intent-discount-pill--pdp {
            bottom: 24px;
          }
          .intent-discount-pill--cart {
            bottom: calc(7.5rem + env(safe-area-inset-bottom, 0px));
          }
        }
        .intent-discount-pill__main,
        .intent-discount-pill__dismiss {
          pointer-events: auto;
        }
        .intent-discount-pill__main {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--accent-border, #a88b5c) 40%, var(--border));
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 8px 20px rgba(26, 60, 52, 0.1);
          color: var(--primary);
          cursor: pointer;
          font-family: inherit;
        }
        .intent-discount-pill__main:hover {
          border-color: var(--accent);
        }
        .intent-discount-pill__label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .intent-discount-pill__dot {
          color: var(--accent-border, #a88b5c);
          font-weight: 700;
        }
        .intent-discount-pill__time {
          font-size: 0.75rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          color: var(--text);
        }
        .intent-discount-pill__dismiss {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          margin: 0;
          padding: 0;
          border: none;
          border-radius: 999px;
          background: color-mix(in srgb, var(--surface) 88%, transparent);
          color: var(--text-muted);
          cursor: pointer;
        }
        .intent-discount-pill__dismiss:hover {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
