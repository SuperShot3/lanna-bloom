'use client';

import { useState, useEffect } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CatalogFilterParams } from '@/lib/sanity';

const CATEGORY_OPTIONS = ['all', 'roses', 'mixed', 'mono', 'inBox', 'romantic', 'birthday', 'sympathy'] as const;
const COLOR_OPTIONS = ['red', 'pink', 'white', 'yellow', 'purple', 'orange', 'mixed'] as const;
const TYPE_OPTIONS = ['rose', 'tulip', 'lily', 'orchid', 'sunflower', 'mixed'] as const;
const OCCASION_OPTIONS = ['', 'birthday', 'anniversary', 'romantic', 'sympathy', 'congrats', 'get_well'] as const;
const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'sortNewest' as const },
  { value: 'price_asc', labelKey: 'sortPriceAsc' as const },
  { value: 'price_desc', labelKey: 'sortPriceDesc' as const },
] as const;

export interface FilterDrawerProps {
  lang: Locale;
  isOpen: boolean;
  onClose: () => void;
  /** Current values from URL */
  values: CatalogFilterParams;
  onApply: (params: CatalogFilterParams) => void;
  onClear: () => void;
  /** For focus trap and aria */
  id?: string;
}

export function FilterDrawer({
  lang,
  isOpen,
  onClose,
  values,
  onApply,
  onClear,
  id = 'filter-drawer',
}: FilterDrawerProps) {
  const t = translations[lang].catalog;
  const categories = translations[lang].categories;
  
  // Color translations mapping
  const colorTranslations: Record<string, string> = {
    red: t.colorRed,
    pink: t.colorPink,
    white: t.colorWhite,
    yellow: t.colorYellow,
    purple: t.colorPurple,
    orange: t.colorOrange,
    mixed: t.colorMixed,
  };
  
  // Type translations mapping
  const typeTranslations: Record<string, string> = {
    rose: t.typeRose,
    tulip: t.typeTulip,
    lily: t.typeLily,
    orchid: t.typeOrchid,
    sunflower: t.typeSunflower,
    mixed: t.typeMixed,
  };
  
  // Occasion translations mapping
  const occasionTranslations: Record<string, string> = {
    '': t.occasionAny,
    birthday: t.occasionBirthday,
    anniversary: t.occasionAnniversary,
    romantic: t.occasionRomantic,
    sympathy: t.occasionSympathy,
    congrats: t.occasionCongrats,
    get_well: t.occasionGetWell,
  };

  const [category, setCategory] = useState(values.category || 'all');
  const [colors, setColors] = useState<string[]>(values.colors || []);
  const [types, setTypes] = useState<string[]>(values.types || []);
  const [occasion, setOccasion] = useState(values.occasion || '');
  const [min, setMin] = useState(String(values.min ?? ''));
  const [max, setMax] = useState(String(values.max ?? ''));
  const [sort, setSort] = useState<string>(values.sort || 'newest');

  useEffect(() => {
    if (!isOpen) return;
    setCategory(values.category || 'all');
    setColors(values.colors || []);
    setTypes(values.types || []);
    setOccasion(values.occasion || '');
    setMin(String(values.min ?? ''));
    setMax(String(values.max ?? ''));
    setSort(values.sort || 'newest');
  }, [isOpen, values]);

  const toggleColor = (c: string) => {
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const toggleType = (ty: string) => {
    setTypes((prev) => (prev.includes(ty) ? prev.filter((x) => x !== ty) : [...prev, ty]));
  };

  const handleApply = () => {
    onApply({
      category: category === 'all' ? undefined : category,
      colors: colors.length ? colors : undefined,
      types: types.length ? types : undefined,
      occasion: occasion || undefined,
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
      sort: sort as CatalogFilterParams['sort'],
    });
    onClose();
  };

  const handleClear = () => {
    setCategory('all');
    setColors([]);
    setTypes([]);
    setOccasion('');
    setMin('');
    setMax('');
    setSort('newest');
    onClear();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="filter-drawer-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label={t.close}
      />
      <div
        id={id}
        className="filter-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
      >
        <div className="filter-drawer-header">
          <h2 id="filter-drawer-title" className="filter-drawer-title">
            {t.filters}
          </h2>
          <button
            type="button"
            className="filter-drawer-close"
            onClick={onClose}
            aria-label={t.close}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="filter-drawer-body">
          <div className="filter-field">
            <label>{t.filterCategory}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="filter-select"
            >
              {CATEGORY_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {key === 'all' ? categories.all : categories[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>{t.filterColors}</label>
            <div className="filter-checkbox-group">
              {COLOR_OPTIONS.map((c) => (
                <label key={c} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={colors.includes(c)}
                    onChange={() => toggleColor(c)}
                  />
                  <span>{colorTranslations[c]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="filter-field">
            <label>{t.filterTypes}</label>
            <div className="filter-checkbox-group">
              {TYPE_OPTIONS.map((ty) => (
                <label key={ty} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={types.includes(ty)}
                    onChange={() => toggleType(ty)}
                  />
                  <span>{typeTranslations[ty]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="filter-field">
            <label>{t.filterOccasion}</label>
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="filter-select"
            >
              {OCCASION_OPTIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occasionTranslations[occ]}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>{t.filterPriceRange}</label>
            <div className="filter-price-row">
              <input
                type="number"
                min={0}
                placeholder={t.minPrice}
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="filter-input"
              />
              <span className="filter-price-sep">–</span>
              <input
                type="number"
                min={0}
                placeholder={t.maxPrice}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="filter-input"
              />
            </div>
          </div>
          <div className="filter-field">
            <label>{t.filterSort}</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="filter-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t[opt.labelKey]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-drawer-footer">
          <button type="button" className="filter-clear-btn" onClick={handleClear}>
            {t.clearFilters}
          </button>
          <button type="button" className="filter-apply-btn" onClick={handleApply}>
            {t.applyFilters}
          </button>
        </div>
      </div>
      <style jsx>{`
        .filter-drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 150;
          background: rgba(45, 42, 38, 0.4);
          cursor: pointer;
        }
        .filter-drawer-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 151;
          width: 100%;
          max-width: 360px;
          background: var(--surface);
          box-shadow: -4px 0 24px rgba(45, 42, 38, 0.1);
          display: flex;
          flex-direction: column;
          border-radius: var(--radius) 0 0 var(--radius);
        }
        .filter-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }
        .filter-drawer-title {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: var(--text);
        }
        .filter-drawer-close {
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
          cursor: pointer;
        }
        .filter-drawer-close:hover,
        .filter-drawer-close:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .filter-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        .filter-field {
          margin-bottom: 20px;
        }
        .filter-field label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text);
          margin-bottom: 8px;
        }
        .filter-select,
        .filter-input {
          width: 100%;
          min-height: 44px;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-family: inherit;
          background: var(--surface);
          color: var(--text);
        }
        .filter-select:focus,
        .filter-input:focus {
          outline: 2px solid var(--accent);
          outline-offset: 0;
        }
        .filter-checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 16px;
        }
        .filter-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          min-height: 44px;
        }
        .filter-checkbox-label input {
          width: 18px;
          height: 18px;
        }
        .filter-price-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-input {
          flex: 1;
        }
        .filter-price-sep {
          color: var(--text-muted);
        }
        .filter-drawer-footer {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
        }
        .filter-clear-btn,
        .filter-apply-btn {
          flex: 1;
          min-height: 44px;
          padding: 0 20px;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        .filter-clear-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .filter-clear-btn:hover,
        .filter-clear-btn:focus-visible {
          background: var(--pastel-cream);
          color: var(--text);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .filter-apply-btn {
          background: var(--accent);
          border: none;
          color: #fff;
        }
        .filter-apply-btn:hover,
        .filter-apply-btn:focus-visible {
          transform: translateY(-1px);
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        @media (min-width: 601px) {
          .filter-drawer-panel {
            border-radius: var(--radius) 0 0 var(--radius);
          }
        }
      `}</style>
    </>
  );
}
