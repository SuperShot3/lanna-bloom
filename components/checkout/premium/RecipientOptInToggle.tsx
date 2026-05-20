'use client';

import type { ReactNode } from 'react';

export function RecipientOptInToggle({
  selected,
  onSelectedChange,
  toggleLabel,
  hintText,
  children,
  variant = 'premium',
}: {
  selected: boolean;
  onSelectedChange: (next: boolean) => void;
  toggleLabel: string;
  hintText: string;
  children: ReactNode;
  variant?: 'premium' | 'cart';
}) {
  const rootClass =
    variant === 'cart' ? 'cart-recipient-opt-in' : 'co-recipient-opt-in';

  return (
    <div className={rootClass}>
      <button
        type="button"
        className={`${rootClass}__chip${selected ? ` ${rootClass}__chip--on` : ''}`}
        onClick={() => onSelectedChange(!selected)}
        aria-pressed={selected}
        aria-expanded={selected}
      >
        {toggleLabel}
      </button>
      <div
        className={`${rootClass}__reveal${selected ? ` ${rootClass}__reveal--open` : ''}`}
        aria-hidden={!selected}
      >
        <div className={`${rootClass}__reveal-inner`}>
          <p className={`${rootClass}__hint`}>{hintText}</p>
          {children}
        </div>
      </div>
      <style jsx>{`
        .co-recipient-opt-in,
        .cart-recipient-opt-in {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }

        .co-recipient-opt-in__chip,
        .cart-recipient-opt-in__chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1.5px solid var(--border);
          background: color-mix(in srgb, var(--pastel-cream) 75%, #fff);
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          color: var(--text);
          cursor: pointer;
          text-align: left;
          line-height: 1.3;
          transition:
            border-color 0.2s ease-out,
            background 0.2s ease-out,
            box-shadow 0.2s ease-out,
            color 0.2s ease-out,
            transform 0.15s ease-out;
        }

        .co-recipient-opt-in__chip:hover,
        .cart-recipient-opt-in__chip:hover {
          border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
          background: var(--pastel-cream);
        }

        .co-recipient-opt-in__chip:active,
        .cart-recipient-opt-in__chip:active {
          transform: scale(0.98);
        }

        .co-recipient-opt-in__chip--on,
        .cart-recipient-opt-in__chip--on {
          border-color: var(--checkout-option-selected-border);
          border-width: 2px;
          padding: 9px 17px;
          background: var(--checkout-option-selected-bg);
          box-shadow: var(--checkout-option-selected-ring);
          color: var(--primary);
          font-weight: 700;
        }

        .co-recipient-opt-in__reveal,
        .cart-recipient-opt-in__reveal {
          display: grid;
          grid-template-rows: 0fr;
          width: 100%;
          opacity: 0;
          margin-top: 0;
          transition:
            grid-template-rows 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94),
            opacity 0.36s ease-out,
            margin-top 0.36s ease-out;
        }

        .co-recipient-opt-in__reveal--open,
        .cart-recipient-opt-in__reveal--open {
          grid-template-rows: 1fr;
          opacity: 1;
          margin-top: 12px;
        }

        .co-recipient-opt-in__reveal-inner,
        .cart-recipient-opt-in__reveal-inner {
          overflow: hidden;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .co-recipient-opt-in__hint,
        .cart-recipient-opt-in__hint {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          line-height: 1.45;
        }

        @media (prefers-reduced-motion: reduce) {
          .co-recipient-opt-in__reveal,
          .cart-recipient-opt-in__reveal {
            transition: none;
          }
          .co-recipient-opt-in__reveal--open,
          .cart-recipient-opt-in__reveal--open {
            margin-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}
