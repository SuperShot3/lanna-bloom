'use client';

import { useEffect, useRef } from 'react';
import { ProductContactBeforeOrderNotice } from '@/components/pdp/ProductContactBeforeOrderNotice';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/header/lockBodyScroll';
import { translations, type Locale } from '@/lib/i18n';

export function PreorderStockContactModal({
  lang,
  isOpen,
  onClose,
  productName,
  sizeLabel,
  destinationLabel,
  whatsappMessage,
  pageLocation = 'product',
}: {
  lang: Locale;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  sizeLabel?: string;
  destinationLabel?: string;
  whatsappMessage?: string;
  pageLocation?: 'product' | 'cart';
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const tProduct = translations[lang].product as Record<string, string | undefined>;
  const dismissLabel = tProduct.preorderStockContactDismiss ?? 'Got it';

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dismissRef.current?.focus();
    lockBodyScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const el = modalRef.current;
      if (!el) return;
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="preorder-stock-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preorder-stock-title"
      ref={modalRef}
    >
      <div
        className="preorder-stock-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={0}
        aria-label={dismissLabel}
      />
      <div className="preorder-stock-card">
        <div className="preorder-stock-header">
          <h2 id="preorder-stock-title" className="preorder-stock-title">
            {tProduct.preorderStockContactTitle ?? 'Please contact us to check stock'}
          </h2>
          <button
            type="button"
            className="preorder-stock-close"
            onClick={onClose}
            aria-label={dismissLabel}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="preorder-stock-notice">
          <ProductContactBeforeOrderNotice
            lang={lang}
            productName={productName}
            sizeLabel={sizeLabel}
            variant="preorder"
            destinationLabel={destinationLabel}
            whatsappMessage={whatsappMessage}
            pageLocation={pageLocation}
            hideHeading
          />
        </div>
        <button
          type="button"
          className="preorder-stock-dismiss"
          onClick={onClose}
          ref={dismissRef}
        >
          {dismissLabel}
        </button>
      </div>
      <style jsx>{`
        .preorder-stock-overlay {
          position: fixed;
          inset: 0;
          z-index: 320;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .preorder-stock-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.45);
          cursor: pointer;
        }
        .preorder-stock-card {
          position: relative;
          z-index: 1;
          background: var(--surface);
          border-radius: 18px;
          box-shadow: var(--shadow-hover);
          max-width: min(420px, calc(100vw - 32px));
          width: 100%;
          padding: 22px;
        }
        .preorder-stock-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .preorder-stock-title {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
          line-height: 1.3;
        }
        .preorder-stock-close {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
        }
        .preorder-stock-close:hover,
        .preorder-stock-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .preorder-stock-notice {
          margin: 0 0 14px;
        }
        .preorder-stock-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 44px;
          padding: 12px 24px;
          background: var(--accent);
          color: var(--accent-cta-text, #2d2a26);
          font-family: inherit;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
        }
        .preorder-stock-dismiss:hover,
        .preorder-stock-dismiss:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
