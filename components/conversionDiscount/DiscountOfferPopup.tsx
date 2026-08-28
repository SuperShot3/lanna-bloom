'use client';

import { useEffect, useRef } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { formatCountdown } from '@/lib/conversionDiscount/eligibility';

export function DiscountOfferPopup({
  lang,
  remainingMs,
  abandoned,
  liftForCart,
  onAccept,
  onClose,
}: {
  lang: Locale;
  remainingMs: number;
  abandoned: boolean;
  liftForCart?: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = translations[lang].conversionDiscount ?? translations.en.conversionDiscount;
  const title = abandoned ? t.popupTitleAbandoned : t.popupTitle;
  const body = abandoned ? t.popupBodyAbandoned : t.popupBody;
  const countdown = formatCountdown(remainingMs);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={`intent-discount-popup${liftForCart ? ' intent-discount-popup--cart' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intent-discount-title"
    >
      <div className="intent-discount-popup__card">
        <button
          ref={closeRef}
          type="button"
          className="intent-discount-popup__close"
          onClick={onClose}
          aria-label={t.popupClose}
        >
          <Cross2Icon width={16} height={16} />
        </button>
        <p id="intent-discount-title" className="intent-discount-popup__title">
          {title}
        </p>
        <p className="intent-discount-popup__body">{body}</p>
        <p className="intent-discount-popup__timer" aria-live="polite">
          {countdown}
        </p>
        <p className="intent-discount-popup__fine">{t.popupFinePrint}</p>
        <button type="button" className="btn-premium intent-discount-popup__cta" onClick={onAccept}>
          {t.popupCta}
        </button>
      </div>
      <style jsx>{`
        .intent-discount-popup {
          position: fixed;
          z-index: 105;
          left: 12px;
          right: auto;
          bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          width: min(22.5rem, calc(100vw - 5.5rem));
          pointer-events: none;
        }
        @media (min-width: 768px) {
          .intent-discount-popup {
            left: 24px;
            bottom: 24px;
          }
        }
        .intent-discount-popup--cart {
          bottom: calc(7.25rem + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 768px) {
          .intent-discount-popup--cart {
            bottom: calc(7.5rem + env(safe-area-inset-bottom, 0px));
          }
        }
        .intent-discount-popup__card {
          pointer-events: auto;
          position: relative;
          padding: 18px 18px 16px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--surface) 94%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid color-mix(in srgb, var(--accent-border, #a88b5c) 35%, var(--border));
          box-shadow:
            0 12px 32px rgba(26, 60, 52, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          animation: intent-discount-in 0.28s var(--ui-overlay-ease, ease) both;
        }
        .intent-discount-popup__close {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }
        .intent-discount-popup__close:hover {
          background: color-mix(in srgb, var(--primary) 8%, transparent);
          color: var(--primary);
        }
        .intent-discount-popup__title {
          margin: 0 28px 8px 0;
          font-family: var(--font-display, Georgia, serif);
          font-size: 1.15rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.25;
          color: var(--primary);
        }
        .intent-discount-popup__body {
          margin: 0 0 10px;
          font-size: 0.875rem;
          line-height: 1.45;
          color: var(--text);
        }
        .intent-discount-popup__timer {
          margin: 0 0 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          font-variant-numeric: tabular-nums;
          color: var(--accent-border, #a88b5c);
        }
        .intent-discount-popup__fine {
          margin: 0 0 14px;
          font-size: 0.6875rem;
          line-height: 1.4;
          color: var(--text-muted);
        }
        .intent-discount-popup__cta {
          width: 100%;
          min-height: 44px;
        }
        @keyframes intent-discount-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .intent-discount-popup__card {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
