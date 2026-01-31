'use client';

import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CatalogFilterParams } from '@/lib/sanity';

export interface CatalogFilterBarProps {
  lang: Locale;
  /** Number of active filters (for summary) */
  activeCount: number;
  isDrawerOpen: boolean;
  onOpenDrawer: () => void;
  /** For aria-controls */
  drawerId?: string;
}

export function CatalogFilterBar({
  lang,
  activeCount,
  isDrawerOpen,
  onOpenDrawer,
  drawerId = 'filter-drawer',
}: CatalogFilterBarProps) {
  const t = translations[lang].catalog;

  return (
    <div className="catalog-filter-bar">
      <button
        type="button"
        className="catalog-filter-btn"
        onClick={onOpenDrawer}
        aria-expanded={isDrawerOpen}
        aria-controls={drawerId}
        aria-haspopup="dialog"
      >
        {t.filters}
        {activeCount > 0 && (
          <span className="catalog-filter-count" aria-hidden>
            ({activeCount})
          </span>
        )}
      </button>
      <style jsx>{`
        .catalog-filter-bar {
          margin-bottom: 20px;
        }
        .catalog-filter-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          font-family: inherit;
          box-shadow: var(--shadow);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .catalog-filter-btn:hover,
        .catalog-filter-btn:focus-visible {
          border-color: var(--accent-soft);
          box-shadow: 0 4px 12px rgba(45, 42, 38, 0.08);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .catalog-filter-count {
          margin-left: 6px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

/** Count how many filter params are set (for summary) */
export function countActiveFilters(params: CatalogFilterParams): number {
  let n = 0;
  if (params.category && params.category !== 'all') n++;
  if (params.colors?.length) n++;
  if (params.types?.length) n++;
  if (params.occasion) n++;
  if (params.min != null && params.min > 0) n++;
  if (params.max != null && params.max > 0) n++;
  if (params.sort && params.sort !== 'newest') n++;
  return n;
}
