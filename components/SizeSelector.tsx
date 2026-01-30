'use client';

import { BouquetSize } from '@/lib/bouquets';

export function SizeSelector({
  sizes,
  selected,
  onSelect,
  lang,
}: {
  sizes: BouquetSize[];
  selected: BouquetSize;
  onSelect: (size: BouquetSize) => void;
  lang: string;
}) {
  return (
    <div className="size-selector">
      <p className="size-label">Size</p>
      <div className="size-options" role="group" aria-label="Bouquet size">
        {sizes.map((size) => (
          <button
            key={size.key}
            type="button"
            className={`size-btn ${selected.key === size.key ? 'active' : ''}`}
            onClick={() => onSelect(size)}
            aria-pressed={selected.key === size.key}
          >
            <span className="size-btn-label">{size.label}</span>
            <span className="size-btn-price">฿{size.price.toLocaleString()}</span>
            <span className="size-btn-desc">{size.description}</span>
          </button>
        ))}
      </div>
      <style jsx>{`
        .size-selector {
          margin: 20px 0;
        }
        .size-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0 0 10px;
        }
        .size-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .size-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 14px;
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
        .size-btn-label {
          font-weight: 700;
          color: var(--text);
        }
        .size-btn-price {
          font-weight: 600;
          color: var(--accent);
          margin-top: 4px;
        }
        .size-btn-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        @media (min-width: 480px) {
          .size-options {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
