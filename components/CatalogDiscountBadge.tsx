'use client';

import { hasCatalogDiscount, normalizeCatalogDiscountPercent } from '@/lib/catalogDiscount';

export function CatalogDiscountBadge({
  discountPercent,
  ariaLabel,
  className = '',
}: {
  discountPercent?: number;
  ariaLabel: string;
  className?: string;
}) {
  const pct = normalizeCatalogDiscountPercent(discountPercent);
  if (!hasCatalogDiscount(pct)) return null;

  return (
    <span
      className={`catalog-discount-badge ${className}`.trim()}
      aria-label={ariaLabel.replace('{percent}', String(pct))}
    >
      <span className="material-symbols-outlined material-symbols-filled catalog-discount-badge__icon" aria-hidden>
        sell
      </span>
      <span className="catalog-discount-badge__pct" aria-hidden>
        -{pct}%
      </span>
      <style jsx>{`
        .catalog-discount-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          z-index: 2;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          min-width: 40px;
          min-height: 40px;
          padding: 4px 6px;
          border-radius: 14px;
          background: linear-gradient(135deg, #fce7f3 0%, #fda4af 100%);
          color: #9f1239;
          border: 1px solid rgba(159, 18, 57, 0.22);
          box-shadow: 0 2px 10px rgba(26, 60, 52, 0.12);
          pointer-events: none;
        }
        .catalog-discount-badge__icon {
          font-size: 18px;
          line-height: 1;
          font-variation-settings: 'FILL' 1;
        }
        .catalog-discount-badge__pct {
          font-size: 10px;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
      `}</style>
    </span>
  );
}
