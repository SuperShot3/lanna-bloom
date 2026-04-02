'use client';

import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CatalogFilterParams } from '@/lib/sanity';
import type { CatalogTopCategory } from '@/lib/catalogCategories';
import { CATALOG_TOP_CATEGORIES, CATEGORY_I18N_KEYS } from '@/lib/catalogCategories';

const SORT_OPTIONS: { value: CatalogFilterParams['sort']; labelKey: 'sortFeatured' | 'sortNewest' | 'sortPriceAsc' | 'sortPriceDesc' }[] = [
  { value: 'newest', labelKey: 'sortFeatured' },
  { value: 'price_asc', labelKey: 'sortPriceAsc' },
  { value: 'price_desc', labelKey: 'sortPriceDesc' },
];

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
  /** When true, hide the filter trigger on large screens (desktop uses sidebar) */
  hideFilterButtonOnDesktop?: boolean;
}

export function CatalogFilterBar({
  lang,
  activeCount,
  isDrawerOpen,
  onOpenDrawer,
  drawerId = 'filter-drawer',
  filterParams,
  onQuickFilter,
  hideFilterButtonOnDesktop = false,
}: CatalogFilterBarProps) {
  const t = translations[lang].catalog;

  const currentTopCategory = filterParams?.topCategory ?? 'flowers';
  const currentSort = filterParams?.sort ?? 'newest';

  const handleTopCategoryClick = (key: CatalogTopCategory) => {
    if (onQuickFilter) {
      onQuickFilter({ topCategory: key === 'flowers' ? undefined : key });
    }
  };

  const handleSortChange = (value: CatalogFilterParams['sort']) => {
    if (onQuickFilter) {
      onQuickFilter({ sort: value });
    }
  };

  return (
    <div className="catalog-filter-bar">
      <div className="catalog-filter-scroll">
        {/* Filter icon button — opens drawer */}
        <button
          type="button"
          className={`catalog-filter-icon-btn ${activeCount > 0 ? 'has-filters' : ''} ${hideFilterButtonOnDesktop ? 'catalog-filter-icon-btn--mobile-only' : ''}`}
          onClick={onOpenDrawer}
          aria-expanded={isDrawerOpen}
          aria-controls={drawerId}
          aria-haspopup="dialog"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {t.filters}
          {activeCount > 0 && (
            <span className="catalog-filter-count-badge" aria-hidden>
              {activeCount}
            </span>
          )}
        </button>

        {/* Top-level categories (flowers, balloons, gifts, …) as chips */}
        {onQuickFilter &&
          CATALOG_TOP_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              className={`catalog-chip catalog-chip--category ${currentTopCategory === key ? 'active' : ''}`}
              onClick={() => handleTopCategoryClick(key)}
              aria-pressed={currentTopCategory === key}
            >
              {t[CATEGORY_I18N_KEYS[key] as keyof typeof t] as string}
            </button>
          ))}

        {/* Sort chip */}
        {onQuickFilter && (
          <div className={`catalog-sort-chip ${currentSort !== 'newest' ? 'active' : ''}`}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            <span className="catalog-sort-label">
              {currentSort === 'newest' ? t.sortFeatured : currentSort === 'price_asc' ? t.sortPriceAsc : t.sortPriceDesc}
            </span>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
            <select
              className="catalog-sort-select"
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value as CatalogFilterParams['sort'])}
              aria-label={t.filterSort}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t[opt.labelKey]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <style jsx>{`
        .catalog-filter-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 6px 0;
        }
        .catalog-filter-scroll {
          display: flex;
          gap: 8px;
          padding: 0 20px 0 0;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          align-items: center;
          min-height: 44px;
        }
        .catalog-filter-scroll::-webkit-scrollbar {
          display: none;
        }

        /* Filter icon button */
        .catalog-filter-icon-btn--mobile-only {
          display: flex;
        }
        /* Must beat base .catalog-filter-icon-btn display:flex below, or desktop never hides */
        @media (min-width: 1024px) {
          .catalog-filter-icon-btn.catalog-filter-icon-btn--mobile-only {
            display: none;
          }
        }
        .catalog-filter-icon-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--text);
          color: var(--surface);
          border: none;
          border-radius: 100px;
          padding: 7px 13px 7px 10px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.15s;
        }
        .catalog-filter-icon-btn:hover {
          background: var(--text-muted);
          box-shadow: 0 3px 0 rgba(0,0,0,0.2), 0 6px 16px rgba(45, 42, 38, 0.2);
          transform: translateY(-2px);
        }
        .catalog-filter-icon-btn:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }
        .catalog-filter-count-badge {
          background: var(--accent);
          color: var(--surface);
          border-radius: 100px;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          margin-left: 2px;
        }

        /* Chips */
        .catalog-chip {
          flex-shrink: 0;
          border: 1.5px solid var(--border);
          background: var(--surface);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-family: inherit;
          font-weight: 400;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.15s;
          white-space: nowrap;
          user-select: none;
        }
        .catalog-chip:active {
          transform: scale(0.95);
        }
        .catalog-chip:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
          box-shadow: 0 3px 0 #a88b5c, 0 6px 16px rgba(45, 42, 38, 0.12);
          transform: translateY(-2px);
        }
        .catalog-chip:focus-visible {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }
        .catalog-chip.active {
          background: var(--accent);
          border-color: var(--accent);
          color: var(--surface);
          font-weight: 500;
        }
        .catalog-chip.active:hover {
          background: #b39868;
          border-color: #967a4d;
          box-shadow: 0 3px 0 #967a4d, 0 6px 16px rgba(45, 42, 38, 0.18);
          transform: translateY(-2px);
        }
        .catalog-chip--category {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Sort chip */
        .catalog-sort-chip {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          border-radius: 100px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-family: inherit;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.15s;
          white-space: nowrap;
          position: relative;
        }
        .catalog-sort-chip:hover {
          border-color: var(--accent);
          background: var(--accent-soft);
          box-shadow: 0 3px 0 #a88b5c, 0 6px 16px rgba(45, 42, 38, 0.12);
          transform: translateY(-2px);
        }
        .catalog-sort-chip:focus-within {
          outline: 3px solid var(--accent);
          outline-offset: 2px;
        }
        .catalog-sort-chip.active {
          border-color: var(--accent);
          color: var(--accent);
        }
        .catalog-sort-chip.active:hover {
          background: var(--accent-soft);
          box-shadow: 0 3px 0 #a88b5c, 0 6px 16px rgba(45, 42, 38, 0.12);
        }
        .catalog-sort-label {
          pointer-events: none;
        }
        .catalog-sort-select {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: 100%;
          cursor: pointer;
          font-size: inherit;
        }
      `}</style>
    </div>
  );
}

