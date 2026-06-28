'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export const HOW_TO_ORDER_INFOGRAPHIC_SRC = '/content/how-to-order-lannabloom.png';

export interface HowToOrderModalProps {
  lang: Locale;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function HowToOrderModal({ lang, isOpen, onClose, triggerRef }: HowToOrderModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const t = translations[lang].hero;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
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

  return (
    <div
      className="how-to-order-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t.ctaHowItWorks}
      ref={modalRef}
    >
      <button
        type="button"
        className="how-to-order-modal-backdrop"
        aria-label={t.howToOrderClose}
        onClick={onClose}
      />
      <button
        type="button"
        ref={closeButtonRef}
        className="how-to-order-modal-close"
        aria-label={t.howToOrderClose}
        onClick={onClose}
      >
        <span aria-hidden>×</span>
      </button>
      <div className="how-to-order-modal-stage" onClick={(e) => e.stopPropagation()}>
        <Image
          src={HOW_TO_ORDER_INFOGRAPHIC_SRC}
          alt={t.howToOrderInfographicAlt}
          width={1055}
          height={1491}
          className="how-to-order-modal-image"
          sizes="(max-width: 768px) 96vw, 92vw"
          priority
        />
      </div>
      <style jsx>{`
        .how-to-order-modal {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }
        .how-to-order-modal-backdrop {
          position: absolute;
          inset: 0;
          margin: 0;
          padding: 0;
          border: none;
          background: rgba(20, 20, 20, 0.82);
          cursor: pointer;
        }
        .how-to-order-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 999px;
          background: rgba(20, 20, 20, 0.72);
          color: #fff;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .how-to-order-modal-close:hover,
        .how-to-order-modal-close:focus-visible {
          background: rgba(20, 20, 20, 0.92);
          transform: scale(1.05);
          outline: 2px solid #fff;
          outline-offset: 2px;
        }
        .how-to-order-modal-stage {
          position: relative;
          z-index: 1;
          width: min(96vw, 920px);
          max-height: calc(100vh - 24px);
          max-height: calc(100dvh - 24px);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .how-to-order-modal-image {
          width: 100%;
          height: auto;
          max-height: calc(100vh - 24px);
          max-height: calc(100dvh - 24px);
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
        }
        @media (min-width: 768px) {
          .how-to-order-modal {
            padding: 20px;
          }
          .how-to-order-modal-close {
            top: 20px;
            right: 20px;
          }
          .how-to-order-modal-stage {
            width: min(92vw, 980px);
            max-height: calc(100vh - 40px);
            max-height: calc(100dvh - 40px);
          }
          .how-to-order-modal-image {
            max-height: calc(100vh - 40px);
            max-height: calc(100dvh - 40px);
          }
        }
      `}</style>
    </div>
  );
}
