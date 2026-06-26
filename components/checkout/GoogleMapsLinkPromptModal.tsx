'use client';

import { useEffect, useRef } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export interface GoogleMapsLinkPromptModalProps {
  lang: Locale;
  isOpen: boolean;
  onAddLocation: () => void;
  onContinueWithout: () => void;
  onClose: () => void;
}

export function GoogleMapsLinkPromptModal({
  lang,
  isOpen,
  onAddLocation,
  onContinueWithout,
  onClose,
}: GoogleMapsLinkPromptModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const t = translations[lang].cart;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    primaryButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps = [t.mapsPromptStep1, t.mapsPromptStep2, t.mapsPromptStep3, t.mapsPromptStep4];

  return (
    <div
      className="maps-prompt-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maps-prompt-title"
      ref={modalRef}
    >
      <div
        className="maps-prompt-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
        role="button"
        tabIndex={0}
        aria-label={t.mapsPromptClose}
      />
      <div className="maps-prompt-card">
        <div className="maps-prompt-header">
          <h2 id="maps-prompt-title" className="maps-prompt-title">
            {t.mapsPromptTitle}
          </h2>
          <button
            type="button"
            className="maps-prompt-close"
            onClick={onClose}
            aria-label={t.mapsPromptClose}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="maps-prompt-body">
          <p className="maps-prompt-text">{t.mapsPromptText}</p>
          <p className="maps-prompt-steps-label">{t.mapsPromptStepsLabel}</p>
          <ol className="maps-prompt-steps">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="maps-prompt-actions">
          <button
            type="button"
            className="maps-prompt-btn maps-prompt-btn--primary"
            onClick={onAddLocation}
            ref={primaryButtonRef}
          >
            {t.mapsPromptAddPin}
          </button>
          <button
            type="button"
            className="maps-prompt-btn maps-prompt-btn--secondary"
            onClick={onContinueWithout}
          >
            {t.mapsPromptContinueWithoutLink}
          </button>
        </div>
      </div>
      <style jsx>{`
        .maps-prompt-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .maps-prompt-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(45, 42, 38, 0.45);
          cursor: pointer;
        }
        .maps-prompt-card {
          position: relative;
          background: color-mix(in srgb, var(--pastel-cream) 35%, #fffdf9);
          border-radius: 18px;
          box-shadow: var(--shadow-hover);
          max-width: 420px;
          width: 100%;
          padding: 24px;
        }
        .maps-prompt-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .maps-prompt-title {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
          line-height: 1.3;
        }
        .maps-prompt-close {
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
        .maps-prompt-close:hover,
        .maps-prompt-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .maps-prompt-body {
          color: var(--text);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .maps-prompt-text {
          margin: 0 0 16px;
        }
        .maps-prompt-steps-label {
          margin: 0 0 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .maps-prompt-steps {
          margin: 0 0 4px;
          padding-left: 1.25rem;
        }
        .maps-prompt-steps li {
          margin-bottom: 6px;
        }
        .maps-prompt-steps li:last-child {
          margin-bottom: 0;
        }
        .maps-prompt-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 22px;
        }
        .maps-prompt-btn {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .maps-prompt-btn--primary {
          border: none;
          background: var(--primary);
          color: #fff;
        }
        .maps-prompt-btn--primary:hover,
        .maps-prompt-btn--primary:focus-visible {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(196, 167, 125, 0.35);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .maps-prompt-btn--secondary {
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
        }
        .maps-prompt-btn--secondary:hover,
        .maps-prompt-btn--secondary:focus-visible {
          background: var(--pastel-cream);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
