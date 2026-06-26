'use client';

import type { ReactNode } from 'react';

export function RecipientOptInToggle({
  selected,
  onSelectedChange,
  toggleLabel,
  chipActive,
  chipComplete,
  children,
  variant = 'premium',
  showChip = true,
  showReveal = true,
}: {
  selected: boolean;
  onSelectedChange: (next: boolean) => void;
  toggleLabel: string;
  /** Chip highlight when collapsed but a choice is saved (defaults to `selected`). */
  chipActive?: boolean;
  /** Green check + compact styling when a gift/card message is already set. */
  chipComplete?: boolean;
  children?: ReactNode;
  variant?: 'premium' | 'cart';
  /** When false, only the expandable panel is rendered (chip lives elsewhere). */
  showChip?: boolean;
  /** When false, only the chip is rendered (panel lives elsewhere). */
  showReveal?: boolean;
}) {
  const rootClass =
    variant === 'cart' ? 'cart-recipient-opt-in' : 'co-recipient-opt-in';
  const chipOn = chipActive ?? selected;

  if (!showChip && !showReveal) return null;

  return (
    <div
      className={`${rootClass}${!showChip ? ` ${rootClass}--reveal-only` : ''}${!showReveal ? ` ${rootClass}--chip-only` : ''}`}
    >
      {showChip && (
        <button
          type="button"
          className={`${rootClass}__chip${chipOn ? ` ${rootClass}__chip--on` : ''}${chipComplete ? ` ${rootClass}__chip--complete` : ''}`}
          onClick={() => onSelectedChange(!selected)}
          aria-pressed={chipOn}
          aria-expanded={selected}
        >
          {chipComplete ? (
            <span className={`${rootClass}__chip-check`} aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
          <span className={`${rootClass}__chip-label`}>{toggleLabel}</span>
        </button>
      )}
      {showReveal && (
        <div
          className={`${rootClass}__reveal${selected ? ` ${rootClass}__reveal--open` : ''}`}
          aria-hidden={!selected}
        >
          <div className={`${rootClass}__reveal-inner`}>{children}</div>
        </div>
      )}
      <style jsx>{`
        .co-recipient-opt-in,
        .cart-recipient-opt-in {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0;
        }

        .co-recipient-opt-in--chip-only,
        .cart-recipient-opt-in--chip-only {
          display: inline-flex;
        }

        .co-recipient-opt-in--reveal-only,
        .cart-recipient-opt-in--reveal-only {
          width: 100%;
        }

        .co-recipient-opt-in__chip,
        .cart-recipient-opt-in__chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
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

        .co-recipient-opt-in__chip-label,
        .cart-recipient-opt-in__chip-label {
          white-space: nowrap;
        }

        .co-recipient-opt-in__chip-check,
        .cart-recipient-opt-in__chip-check {
          display: inline-flex;
          flex-shrink: 0;
          color: #2e7d52;
        }

        .co-recipient-opt-in__chip--complete,
        .cart-recipient-opt-in__chip--complete {
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 600;
          border-color: #b8dcc4;
          background: #eef8f1;
          color: #1e6b45;
        }

        .co-recipient-opt-in__chip--complete.co-recipient-opt-in__chip--on,
        .cart-recipient-opt-in__chip--complete.cart-recipient-opt-in__chip--on {
          padding: 7px 13px;
          border-color: #2e7d52;
          background: #e4f4ea;
          box-shadow: 0 0 0 2px color-mix(in srgb, #2e7d52 18%, transparent);
          color: #1e6b45;
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
