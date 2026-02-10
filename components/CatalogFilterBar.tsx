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
  /** Current filter params to determine active chips */
  filterParams?: CatalogFilterParams;
  /** Callback for quick filter chip clicks */
  onQuickFilter?: (partialParams: Partial<CatalogFilterParams>) => void;
  /** Callback to clear all filters */
  onClearAll?: () => void;
}

export function CatalogFilterBar({
  lang,
  activeCount,
  isDrawerOpen,
  onOpenDrawer,
  drawerId = 'filter-drawer',
  filterParams,
  onQuickFilter,
  onClearAll,
}: CatalogFilterBarProps) {
  const t = translations[lang].catalog;

  // Determine active states for quick filter chips
  const isMax1000Active = filterParams?.max === 1000;
  const isMax1500Active = filterParams?.max === 1500;
  const isPriceAscActive = filterParams?.sort === 'price_asc';
  const isPriceDescActive = filterParams?.sort === 'price_desc';

  const handleQuickFilterClick = (partial: Partial<CatalogFilterParams>) => {
    if (onQuickFilter) {
      onQuickFilter(partial);
    }
  };

  return (
    <div className="catalog-filter-bar">
      <div className="catalog-filter-bar-row">
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
        {onQuickFilter && (
          <div className="catalog-quick-filters">
            <button
              type="button"
              className={`catalog-quick-filter-chip ${isMax1000Active ? 'active' : ''}`}
              onClick={() => handleQuickFilterClick({ max: isMax1000Active ? undefined : 1000 })}
              aria-pressed={isMax1000Active}
            >
              {t.quickFilterUnder1000}
            </button>
            <button
              type="button"
              className={`catalog-quick-filter-chip ${isMax1500Active ? 'active' : ''}`}
              onClick={() => handleQuickFilterClick({ max: isMax1500Active ? undefined : 1500 })}
              aria-pressed={isMax1500Active}
            >
              {t.quickFilterUnder1500}
            </button>
            <button
              type="button"
              className={`catalog-quick-filter-chip ${isPriceAscActive ? 'active' : ''}`}
              onClick={() => handleQuickFilterClick({ sort: isPriceAscActive ? 'newest' : 'price_asc' })}
              aria-pressed={isPriceAscActive}
            >
              {t.sortPriceAsc}
            </button>
            <button
              type="button"
              className={`catalog-quick-filter-chip ${isPriceDescActive ? 'active' : ''}`}
              onClick={() => handleQuickFilterClick({ sort: isPriceDescActive ? 'newest' : 'price_desc' })}
              aria-pressed={isPriceDescActive}
            >
              {t.sortPriceDesc}
            </button>
            {onClearAll && activeCount > 0 && (
              <button
                type="button"
                className="catalog-quick-filter-chip catalog-quick-filter-clear"
                onClick={onClearAll}
                aria-label={t.clearFilters}
                title={t.clearFilters}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        .catalog-filter-bar {
          margin-bottom: 20px;
        }
        .catalog-filter-bar-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
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
        .catalog-quick-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .catalog-quick-filter-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .catalog-quick-filter-chip:hover,
        .catalog-quick-filter-chip:focus-visible {
          border-color: var(--accent-soft);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .catalog-quick-filter-chip.active {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent);
          font-weight: 600;
        }
        .catalog-quick-filter-chip.active:hover {
          background: var(--accent-soft);
        }
        .catalog-quick-filter-clear {
          padding: 0 12px;
          font-size: 1.25rem;
          line-height: 1;
          font-weight: 400;
        }
        .catalog-quick-filter-clear:hover {
          background: var(--pastel-cream);
          border-color: var(--text-muted);
        }
        @media (max-width: 600px) {
          .catalog-filter-bar-row {
            flex-direction: column;
            align-items: stretch;
          }
          .catalog-quick-filters {
            width: 100%;
          }
          .catalog-quick-filter-chip {
            flex: 1;
            min-width: 0;
          }
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
