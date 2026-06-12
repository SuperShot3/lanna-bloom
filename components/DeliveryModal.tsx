'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export interface DeliveryModalProps {
  lang: Locale;
  isOpen: boolean;
  onClose: () => void;
  /** Ref of the element that opened the modal (for return focus) */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function DeliveryModal({ lang, isOpen, onClose, triggerRef }: DeliveryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const t = translations[lang].delivery;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
      if (e.key === 'Tab') {
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
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const catalogHref = `/${lang}/catalog`;

  return (
    <div
      className="delivery-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-modal-title"
      ref={modalRef}
    >
      <div
        className="delivery-modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="delivery-modal-card">
        <div className="delivery-modal-header">
          <h2 id="delivery-modal-title" className="delivery-modal-title">
            {t.title}
          </h2>
          <button
            type="button"
            className="delivery-modal-close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="delivery-modal-body">
          <p>{t.line1}</p>
          <p>{t.line2}</p>
          <p>{t.line3}</p>
          <p>{t.line4}</p>
        </div>
        <div className="delivery-modal-footer">
          <Link
            href={catalogHref}
            className="delivery-modal-cta"
            onClick={onClose}
          >
            {t.ctaShopNow}
          </Link>
        </div>
      </div>
      <style jsx>{`
        .delivery-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .delivery-modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.4);
          cursor: pointer;
        }
        .delivery-modal-card {
          position: relative;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow-hover);
          max-width: 420px;
          width: 100%;
          padding: 24px;
        }
        .delivery-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .delivery-modal-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
        }
        .delivery-modal-close {
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
          transition: background 0.2s, color 0.2s;
        }
        .delivery-modal-close:hover,
        .delivery-modal-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .delivery-modal-body {
          color: var(--text);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .delivery-modal-body p {
          margin: 0 0 10px;
        }
        .delivery-modal-body p:last-child {
          margin-bottom: 0;
        }
        .delivery-modal-footer {
          margin-top: 24px;
        }
        .delivery-modal-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 24px;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 9999px;
          box-shadow: 0 4px 14px rgba(196, 167, 125, 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .delivery-modal-cta:hover,
        .delivery-modal-cta:focus-visible {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(196, 167, 125, 0.4);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
