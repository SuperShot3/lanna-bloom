'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

const STORAGE_KEY = 'lannabloom_preorder_only_dismissed_date';

const BANGKOK_TZ = 'Asia/Bangkok';

function getTodayBangkok(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: BANGKOK_TZ });
}

function getFormattedDateBangkok(lang: 'en' | 'th'): string {
  const d = new Date();
  if (lang === 'th') {
    return d.toLocaleDateString('th-TH', {
      timeZone: BANGKOK_TZ,
      day: 'numeric',
      month: 'long',
    });
  }
  return d.toLocaleDateString('en-GB', {
    timeZone: BANGKOK_TZ,
    day: 'numeric',
    month: 'long',
  });
}

export interface PreorderOnlyModalProps {
  /** Optional; when omitted, derives from pathname (/th → th, else en) */
  lang?: Locale;
}

export function PreorderOnlyModal({ lang: langProp }: PreorderOnlyModalProps) {
  const pathname = usePathname();
  const derivedLang: Locale = pathname?.startsWith('/th') ? 'th' : 'en';
  const lang = langProp ?? derivedLang;

  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dismissButtonRef = useRef<HTMLButtonElement>(null);
  const t = translations[lang].preorderModal;
  const formattedDate = getFormattedDateBangkok(lang);
  const bodyParts = t.body.split('{date}');

  // On mount: check localStorage and today's date
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const today = getTodayBangkok();
      if (stored === today) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      const today = getTodayBangkok();
      localStorage.setItem(STORAGE_KEY, today);
    } catch {
      // ignore
    }
    setIsOpen(false);
  }, []);

  // When open: body overflow, ESC, focus trap
  useEffect(() => {
    if (!isOpen) return;
    dismissButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
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
    };
  }, [isOpen, handleDismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="preorder-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preorder-modal-title"
      ref={modalRef}
    >
      <div
        className="preorder-modal-backdrop"
        onClick={handleDismiss}
        onKeyDown={(e) => e.key === 'Enter' && handleDismiss()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="preorder-modal-card">
        <div className="preorder-modal-header">
          <h2 id="preorder-modal-title" className="preorder-modal-title">
            {t.title}
          </h2>
          <button
            type="button"
            className="preorder-modal-close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <p className="preorder-modal-body">
          {bodyParts[0]}
          <strong>{formattedDate}</strong>
          {bodyParts[1] ?? ''}
        </p>
        <div className="preorder-modal-footer">
          <button
            type="button"
            className="preorder-modal-dismiss"
            onClick={handleDismiss}
            ref={dismissButtonRef}
          >
            {t.dismiss}
          </button>
        </div>
      </div>
      <style jsx>{`
        .preorder-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        @media (min-width: 481px) {
          .preorder-modal-overlay {
            padding: 20px;
          }
        }
        .preorder-modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.4);
          cursor: pointer;
        }
        .preorder-modal-card {
          position: relative;
          z-index: 1;
          background: var(--surface);
          border-radius: var(--radius);
          box-shadow: var(--shadow-hover);
          max-width: min(420px, calc(100vw - 32px));
          width: 100%;
          padding: 20px;
          overflow: visible;
        }
        @media (max-width: 480px) {
          .preorder-modal-card {
            padding: 16px;
          }
        }
        .preorder-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }
        .preorder-modal-body {
          margin: 0 0 20px;
          font-size: 0.95rem;
          line-height: 1.5;
          color: var(--text-muted);
        }
        .preorder-modal-body strong {
          color: var(--text);
          font-weight: 700;
        }
        .preorder-modal-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
        }
        @media (max-width: 480px) {
          .preorder-modal-title {
            font-size: 1.2rem;
          }
        }
        .preorder-modal-close {
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
        .preorder-modal-close:hover,
        .preorder-modal-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .preorder-modal-footer {
          margin-top: 0;
        }
        .preorder-modal-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 44px;
          padding: 12px 24px;
          background: var(--accent);
          color: #fff !important;
          font-family: inherit;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(196, 167, 125, 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .preorder-modal-dismiss:hover,
        .preorder-modal-dismiss:focus-visible {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(196, 167, 125, 0.4);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
