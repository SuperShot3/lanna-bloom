'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export interface InformationModalProps {
  lang: Locale;
  isOpen: boolean;
  onClose: () => void;
  /** Ref of the element that opened the modal (for return focus) */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function InformationModal({ lang, isOpen, onClose, triggerRef }: InformationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const t = translations[lang].nav;

  useEffect(() => {
    if (!isOpen) return;
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
      triggerRef?.current?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="information-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="information-modal-title"
      ref={modalRef}
    >
      <div
        className="information-modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="information-modal-card">
        <div className="information-modal-header">
          <h2 id="information-modal-title" className="information-modal-title">
            {t.information}
          </h2>
          <button
            type="button"
            className="information-modal-close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <nav className="information-modal-body" aria-label="Information">
          <Link
            href={`/${lang}/guides/flowers-chiang-mai`}
            className="information-modal-link"
            onClick={onClose}
          >
            {t.flowerDeliveryChiangMai}
          </Link>
          <Link
            href={`/${lang}/guides/rose-bouquets-chiang-mai`}
            className="information-modal-link"
            onClick={onClose}
          >
            {t.roseBouquetsChiangMai}
          </Link>
          <Link
            href={`/${lang}/guides/same-day-flower-delivery-chiang-mai`}
            className="information-modal-link"
            onClick={onClose}
          >
            {t.sameDayFlowerDeliveryChiangMai}
          </Link>
        </nav>
      </div>
      <style jsx>{`
        .information-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .information-modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.4);
          cursor: pointer;
        }
        .information-modal-card {
          position: relative;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow-hover);
          max-width: 420px;
          width: 100%;
          padding: 24px;
        }
        .information-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        .information-modal-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
        }
        .information-modal-close {
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
        .information-modal-close:hover,
        .information-modal-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .information-modal-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .information-modal-link {
          display: block;
          padding: 12px 16px;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text);
          text-decoration: none;
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          transition: background 0.2s, color 0.2s;
        }
        .information-modal-link:hover,
        .information-modal-link:focus-visible {
          background: var(--accent-soft);
          color: var(--accent);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
