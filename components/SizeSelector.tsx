'use client';

import { BouquetSize } from '@/lib/bouquets';
import type { Locale } from '@/lib/i18n';
import { optionDisplayLabel } from '@/lib/bouquetOptions';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';

export function SizeSelector({
  sizes,
  selected,
  onSelect,
  lang,
  destinationId,
}: {
  sizes: BouquetSize[];
  selected: BouquetSize;
  onSelect: (size: BouquetSize) => void;
  lang: Locale;
  destinationId: DeliveryDestinationId;
}) {
  const selectedSizeLabel = optionDisplayLabel(selected, lang);
  const selectedSizeText = lang === 'th' ? `ขนาดที่เลือก: ${selectedSizeLabel}` : `Selected size: ${selectedSizeLabel}`;

  return (
    <div className="size-selector">
      <p className="size-label">Options</p>
      <p className="size-selected">{selectedSizeText}</p>
      <div className="size-options" role="group" aria-label="Bouquet options">
        {sizes.map((size) => {
          const displayPrice = applyExpansionItemMarkupThb(size.price, destinationId);
          return (
            <button
              key={size.optionId}
              type="button"
              className={`size-btn ${selected.optionId === size.optionId ? 'active' : ''}`}
              onClick={() => onSelect(size)}
              aria-pressed={selected.optionId === size.optionId}
              aria-label={`${optionDisplayLabel(size, lang)} ฿${displayPrice.toLocaleString()}`}
            >
              <span className="size-btn-price">฿{displayPrice.toLocaleString()}</span>
            {size.description ? (
              <span className="size-btn-desc">{size.description}</span>
            ) : null}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .size-selector {
          margin: 12px 0;
        }
        .size-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0 0 10px;
        }
        .size-options {
          display: flex;
          flex-wrap: nowrap;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .size-options::-webkit-scrollbar {
          display: none;
        }
        .size-selected {
          margin: 0 0 10px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          line-height: 1.35;
        }
        .size-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          flex: 0 0 auto;
          width: max-content;
          min-width: 0;
          max-width: 100%;
          padding: 10px 12px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .size-btn:hover {
          border-color: var(--accent-soft);
        }
        .size-btn.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .size-btn-price {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--accent);
          margin-top: 0;
          line-height: 1.2;
          white-space: nowrap;
        }
        .size-btn-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        @media (min-width: 768px) {
          .size-options {
            display: grid;
            overflow-x: visible;
            padding-bottom: 0;
            grid-template-columns: repeat(4, 1fr);
          }
          .size-btn {
            width: auto;
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
}
