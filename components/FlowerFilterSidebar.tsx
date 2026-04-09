'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import type { CatalogFilterParams } from '@/lib/sanity';
import type { StemBucketKey } from '@/lib/bouquetOptions';
import { STEM_BUCKET_RANGES } from '@/lib/bouquetOptions';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { CATALOG_OCCASION_CHIPS } from '@/lib/catalogCategories';

const COLOR_KEYS = ['red', 'pink', 'white', 'yellow', 'purple', 'orange', 'mixed'] as const;
const FLOWER_TYPES = ['rose', 'tulip', 'lily', 'orchid', 'sunflower', 'mixed'] as const;
const DELIVERY_OPTS = ['same_day', 'next_day'] as const;
const FORMAT_OPTS = ['bouquet', 'box', 'vase', 'basket', 'arrangement'] as const;
const STEM_OPTS: { key: StemBucketKey; labelKey: 'stemSmall' | 'stemMedium' | 'stemLarge' | 'stemGrand' }[] = [
  { key: 'small', labelKey: 'stemSmall' },
  { key: 'medium', labelKey: 'stemMedium' },
  { key: 'large', labelKey: 'stemLarge' },
  { key: 'grand', labelKey: 'stemGrand' },
];

/** Catalog price slider: one track, min (left) + max (right) thumbs */
const PRICE_SLIDER_MAX = 8000;
const PRICE_SLIDER_STEP = 100;

const COLOR_HEX: Record<string, string> = {
  red: '#C41E3A',
  pink: '#F4A6C1',
  white: '#F5F5F5',
  yellow: '#F5D547',
  purple: '#7B68A6',
  orange: '#E8944A',
  mixed: 'linear-gradient(135deg,#C41E3A,#F4A6C1,#F5D547)',
};

function CollapsibleChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C4A3A" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Collapsible({
  title,
  openDefault = false,
  showChevron = true,
  children,
}: {
  title: string;
  openDefault?: boolean;
  /** When false, section header has no chevron (e.g. price range). */
  showChevron?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(openDefault);
  const panelId = useId();
  return (
    <div className="flower-filter-group">
      <button
        type="button"
        className="flower-filter-group-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="flower-filter-group-title">{title}</span>
        {showChevron ? (
          <span className={`flower-filter-chevron-wrap${open ? ' is-open' : ''}`} aria-hidden>
            <CollapsibleChevronIcon />
          </span>
        ) : null}
      </button>
      <div id={panelId} className={`flower-filter-group-body ${open ? 'is-open' : ''}`}>
        <div className="flower-filter-group-inner">{children}</div>
      </div>
    </div>
  );
}

function filterPanelClassName(mobileSheet: boolean) {
  return `flower-filter-panel ${mobileSheet ? 'flower-filter-panel--sheet' : ''}`;
}

export interface FlowerFilterPanelProps {
  lang: Locale;
  values: CatalogFilterParams;
  flowerTypeCounts?: Record<string, number>;
  onApply: (p: CatalogFilterParams) => void;
  onClear: () => void;
  /** When true, panel is inside mobile bottom sheet (full width) */
  mobileSheet?: boolean;
}

export function FlowerFilterPanel({
  lang,
  values,
  flowerTypeCounts,
  onApply,
  onClear,
  mobileSheet = false,
}: FlowerFilterPanelProps) {
  const t = translations[lang].catalog;
  const committedKey = useMemo(() => buildCatalogSearchString(values), [values]);

  /** Local selections; URL updates only when the user clicks “Apply filters”. */
  const [draft, setDraft] = useState<CatalogFilterParams>(values);

  const [minStr, setMinStr] = useState(values.min != null ? String(values.min) : '');
  const [maxStr, setMaxStr] = useState(values.max != null ? String(values.max) : '');
  const [rangeLo, setRangeLo] = useState(0);
  const [rangeHi, setRangeHi] = useState(PRICE_SLIDER_MAX);
  const rangeRef = useRef({ lo: 0, hi: PRICE_SLIDER_MAX });
  rangeRef.current = { lo: rangeLo, hi: rangeHi };

  useEffect(() => {
    setDraft(values);
    const lo = values.min != null && values.min > 0 ? values.min : 0;
    const hi =
      values.max != null && values.max > 0 ? Math.min(values.max, PRICE_SLIDER_MAX) : PRICE_SLIDER_MAX;
    setRangeLo(lo);
    setRangeHi(hi);
    setMinStr(values.min != null && values.min > 0 ? String(values.min) : '');
    setMaxStr(values.max != null && values.max > 0 ? String(values.max) : '');
  }, [committedKey]);

  const draftKey = useMemo(() => buildCatalogSearchString(draft), [draft]);
  const isDirty = draftKey !== committedKey;

  const applyPrice = useCallback(() => {
    const min = minStr ? parseInt(minStr, 10) : undefined;
    const max = maxStr ? parseInt(maxStr, 10) : undefined;
    setDraft((d) => ({
      ...d,
      min: min != null && !isNaN(min) && min > 0 ? min : undefined,
      max: max != null && !isNaN(max) && max > 0 ? max : undefined,
    }));
  }, [minStr, maxStr]);

  const toggleMulti = useCallback((key: 'colors' | 'types' | 'delivery' | 'formats', id: string) => {
    setDraft((d) => {
      const cur = new Set(d[key] ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      const next = Array.from(cur);
      return { ...d, [key]: next.length ? next : undefined };
    });
  }, []);

  const toggleStem = useCallback((bucket: StemBucketKey) => {
    setDraft((d) => ({
      ...d,
      stemBucket: d.stemBucket === bucket ? undefined : bucket,
    }));
  }, []);

  const activePills = useMemo(() => {
    const pills: { key: string; label: string; remove: () => void }[] = [];
    const add = (key: string, label: string, fn: () => void) => pills.push({ key, label, remove: fn });

    // Price range is not shown here — only in the dedicated price inputs / slider below.
    draft.colors?.forEach((c) =>
      add(`c-${c}`, t[`color${c.charAt(0).toUpperCase() + c.slice(1)}` as keyof typeof t] as string, () =>
        setDraft((d) => ({ ...d, colors: d.colors?.filter((x) => x !== c) }))
      )
    );
    draft.types?.forEach((ty) =>
      add(`t-${ty}`, t[`type${ty.charAt(0).toUpperCase() + ty.slice(1)}` as keyof typeof t] as string, () =>
        setDraft((d) => ({ ...d, types: d.types?.filter((x) => x !== ty) }))
      )
    );
    draft.delivery?.forEach((d) =>
      add(`d-${d}`, d === 'same_day' ? t.deliverySameDay : t.deliveryNextDay, () =>
        setDraft((prev) => ({ ...prev, delivery: prev.delivery?.filter((x) => x !== d) }))
      )
    );
    const fmtLabel: Record<string, keyof typeof t> = {
      bouquet: 'formatBouquet',
      box: 'formatBox',
      vase: 'formatVase',
      basket: 'formatBasket',
      arrangement: 'formatArrangement',
    };
    draft.formats?.forEach((f) =>
      add(`f-${f}`, t[fmtLabel[f]], () =>
        setDraft((d) => ({ ...d, formats: d.formats?.filter((x) => x !== f) }))
      )
    );
    if (draft.stemBucket) {
      const sk = STEM_OPTS.find((s) => s.key === draft.stemBucket);
      if (sk) add('stem', t[sk.labelKey], () => setDraft((d) => ({ ...d, stemBucket: undefined })));
    }
    if (draft.occasion) {
      const oc = CATALOG_OCCASION_CHIPS.find((c) => c.value === draft.occasion);
      if (oc)
        add('occasion', t[oc.labelKey] as string, () => setDraft((d) => ({ ...d, occasion: undefined })));
    }
    return pills;
  }, [draft, t]);

  const commitPriceFromSlider = useCallback(() => {
    const { lo, hi } = rangeRef.current;
    setMinStr(lo > 0 ? String(lo) : '');
    setMaxStr(hi < PRICE_SLIDER_MAX ? String(hi) : '');
    setDraft((d) => ({
      ...d,
      min: lo > 0 ? lo : undefined,
      max: hi > 0 && hi < PRICE_SLIDER_MAX ? hi : undefined,
    }));
  }, []);

  const onMinSliderChange = (v: number) => {
    const next = Math.min(v, rangeHi - PRICE_SLIDER_STEP);
    setRangeLo(Math.max(0, next));
  };

  const onMaxSliderChange = (v: number) => {
    const next = Math.max(v, rangeLo + PRICE_SLIDER_STEP);
    setRangeHi(Math.min(PRICE_SLIDER_MAX, next));
  };

  /** Which thumb sits on top when they overlap (so both stay draggable). */
  const minThumbOnTop = rangeLo <= PRICE_SLIDER_MAX - rangeHi;

  return (
    <div className={filterPanelClassName(mobileSheet)}>
      {!mobileSheet && (
        <div className="flower-filter-header-row">
          <h2 className="flower-filter-title">{t.filters}</h2>
          <button type="button" className="flower-filter-clear-all" onClick={onClear}>
            {t.clearAllFilters}
          </button>
        </div>
      )}

      <button
        type="button"
        className="flower-filter-apply"
        disabled={!isDirty}
        onClick={() => onApply(draft)}
      >
        {t.applyFilters}
      </button>

      {activePills.length > 0 && (
        <div className="flower-filter-active">
          <p className="flower-filter-active-label">{t.activeFiltersLabel}</p>
          <div className="flower-filter-pills">
            {activePills.map((p) => (
              <span key={p.key} className="flower-filter-pill">
                {p.label}
                <button type="button" className="flower-filter-pill-x" onClick={p.remove} aria-label={t.close}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flower-filter-group">
        <p className="flower-filter-group-static-heading">{t.filterPriceRange}</p>
        <div className="flower-dual-range">
          <div className="flower-dual-range-track" aria-hidden />
          <div
            className="flower-dual-range-fill"
            style={{
              left: `${(rangeLo / PRICE_SLIDER_MAX) * 100}%`,
              width: `${(Math.max(0, rangeHi - rangeLo) / PRICE_SLIDER_MAX) * 100}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={PRICE_SLIDER_MAX}
            step={PRICE_SLIDER_STEP}
            value={rangeLo}
            onChange={(e) => onMinSliderChange(Number(e.target.value))}
            onPointerUp={commitPriceFromSlider}
            className="flower-dual-range-input flower-dual-range-input--min"
            style={{ zIndex: minThumbOnTop ? 5 : 3 }}
            aria-label={t.minPrice}
          />
          <input
            type="range"
            min={0}
            max={PRICE_SLIDER_MAX}
            step={PRICE_SLIDER_STEP}
            value={rangeHi}
            onChange={(e) => onMaxSliderChange(Number(e.target.value))}
            onPointerUp={commitPriceFromSlider}
            className="flower-dual-range-input flower-dual-range-input--max"
            style={{ zIndex: minThumbOnTop ? 3 : 5 }}
            aria-label={t.maxPrice}
          />
        </div>
        <div className="flower-filter-price-inputs">
          <span className="flower-filter-baht">฿</span>
          <input
            type="number"
            min={0}
            className="flower-filter-input"
            placeholder={t.minPrice}
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          />
          <span className="flower-filter-dash">–</span>
          <span className="flower-filter-baht">฿</span>
          <input
            type="number"
            min={0}
            className="flower-filter-input"
            placeholder={t.maxPrice}
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          />
        </div>
      </div>

      <div className="flower-filter-group flower-filter-group--swatches">
        <p className="flower-filter-group-static-heading">{t.filterColors}</p>
        <div className="flower-swatch-grid">
          {COLOR_KEYS.map((c) => {
            const active = draft.colors?.includes(c);
            const fill = COLOR_HEX[c];
            return (
              <div key={c} className="flower-swatch-wrap">
                <button
                  type="button"
                  className={`flower-swatch ${active ? 'is-active' : ''}`}
                  style={{ background: fill }}
                  onClick={() => toggleMulti('colors', c)}
                  aria-pressed={active}
                  aria-label={t[`color${c.charAt(0).toUpperCase() + c.slice(1)}` as keyof typeof t] as string}
                />
                <span className="flower-swatch-tip">
                  {t[`color${c.charAt(0).toUpperCase() + c.slice(1)}` as keyof typeof t] as string}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(draft.topCategory ?? 'flowers') === 'flowers' && (
        <Collapsible title={t.filterOccasion}>
          <div className="flower-pill-row">
            {CATALOG_OCCASION_CHIPS.map(({ value, labelKey }) => {
              const active = value === '' ? !draft.occasion : draft.occasion === value;
              return (
                <button
                  key={value || 'any'}
                  type="button"
                  className={`flower-pill ${active ? 'is-active' : ''}`}
                  onClick={() => setDraft((d) => ({ ...d, occasion: value || undefined }))}
                  aria-pressed={active}
                >
                  {t[labelKey] as string}
                </button>
              );
            })}
          </div>
        </Collapsible>
      )}

      <Collapsible title={t.filterTypes}>
        <ul className="flower-check-list">
          {FLOWER_TYPES.map((ty) => {
            const checked = values.types?.includes(ty) ?? false;
            const count = flowerTypeCounts?.[ty];
            return (
              <li key={ty}>
                <label className="flower-check-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMulti('types', ty)}
                  />
                  <span>{t[`type${ty.charAt(0).toUpperCase() + ty.slice(1)}` as keyof typeof t] as string}</span>
                  {count != null && <span className="flower-count-muted">({count})</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </Collapsible>

      <Collapsible title={t.filterDelivery}>
        <ul className="flower-check-list">
          {DELIVERY_OPTS.map((d) => {
            const checked = draft.delivery?.includes(d) ?? false;
            return (
              <li key={d}>
                <label className="flower-check-row">
                  <input type="checkbox" checked={checked} onChange={() => toggleMulti('delivery', d)} />
                  <span>{d === 'same_day' ? t.deliverySameDay : t.deliveryNextDay}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </Collapsible>

      <Collapsible title={t.filterFormat}>
        <div className="flower-pill-row">
          {FORMAT_OPTS.map((f) => {
            const active = draft.formats?.includes(f) ?? false;
            const labelKey = {
              bouquet: 'formatBouquet',
              box: 'formatBox',
              vase: 'formatVase',
              basket: 'formatBasket',
              arrangement: 'formatArrangement',
            }[f] as keyof typeof t;
            return (
              <button
                key={f}
                type="button"
                className={`flower-pill ${active ? 'is-active' : ''}`}
                onClick={() => toggleMulti('formats', f)}
              >
                {t[labelKey]}
              </button>
            );
          })}
        </div>
      </Collapsible>

      <Collapsible title={t.filterStemBucket}>
        <div className="flower-pill-row flower-pill-row--stem">
          {STEM_OPTS.map(({ key, labelKey }) => {
            const active = draft.stemBucket === key;
            return (
              <button
                key={key}
                type="button"
                className={`flower-pill ${active ? 'is-active' : ''}`}
                onClick={() => toggleStem(key)}
              >
                {t[labelKey]} ({STEM_BUCKET_RANGES[key].min}–{STEM_BUCKET_RANGES[key].max === 9999 ? '30+' : STEM_BUCKET_RANGES[key].max})
              </button>
            );
          })}
        </div>
      </Collapsible>

      {/* Collapsible is a child component — scoped styled-jsx can miss its DOM; use global + panel prefix */}
      <style jsx global>{`
        .flower-filter-panel .flower-filter-group {
          border-bottom: 1px solid #ede6df;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .flower-filter-panel .flower-filter-group:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .flower-filter-panel .flower-filter-group-head {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 500;
          color: #2c2420;
          text-align: left;
        }
        .flower-filter-panel .flower-filter-group-title {
          flex: 1 1 auto;
          min-width: 0;
          text-align: start;
        }
        .flower-filter-panel .flower-filter-chevron-wrap {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          transform: rotate(0deg);
          transform-origin: center;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flower-filter-panel .flower-filter-chevron-wrap.is-open {
          transform: rotate(180deg);
        }
        .flower-filter-panel .flower-filter-group-body {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.25s ease;
        }
        .flower-filter-panel .flower-filter-group-body.is-open {
          grid-template-rows: 1fr;
        }
        .flower-filter-panel .flower-filter-group-inner {
          overflow: hidden;
          min-height: 0;
        }
        .flower-filter-panel .flower-filter-group-static-heading {
          margin: 0;
          padding: 8px 0 10px;
          font-size: 13px;
          font-weight: 500;
          color: #2c2420;
        }
        .flower-filter-panel .flower-filter-group--swatches {
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .flower-filter-panel .flower-filter-group--swatches .flower-filter-group-static-heading {
          padding: 4px 0 6px;
        }
      `}</style>
      <style jsx>{`
        .flower-filter-panel {
          width: 248px;
          flex-shrink: 0;
          background: #fdf9f4;
          border: 1px solid #e8e0d8;
          border-radius: 20px;
          padding: 24px;
          box-sizing: border-box;
        }
        .flower-filter-panel--sheet {
          width: 100%;
          border: none;
          border-radius: 0;
          padding: 12px 16px 16px;
          max-height: none;
          overflow: visible;
        }
        .flower-filter-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .flower-filter-title {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #2c2420;
        }
        .flower-filter-clear-all {
          font-size: 12px;
          color: #8a7a72;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 0;
        }
        .flower-filter-clear-all:hover {
          text-decoration: underline;
        }
        .flower-filter-apply {
          width: 100%;
          margin-bottom: 14px;
          padding: 10px 14px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: #c5a059;
          color: #1a3c34;
          box-shadow: 0 2px 0 #a88b5c;
          transition: background 0.15s ease, opacity 0.15s ease;
        }
        .flower-filter-apply:hover:not(:disabled) {
          background: #d4af37;
        }
        .flower-filter-apply:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
        .flower-filter-active {
          margin-bottom: 16px;
        }
        .flower-filter-active-label {
          font-size: 11px;
          font-weight: 500;
          color: #5c4a3a;
          margin: 0 0 8px;
        }
        .flower-filter-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .flower-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #e8e0d8;
          font-size: 12px;
          color: #5c4a3a;
        }
        .flower-filter-pill-x {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0 2px;
          color: #5c4a3a;
        }
        .flower-dual-range {
          position: relative;
          width: 100%;
          height: 44px;
          margin-bottom: 10px;
          --flower-range-accent: #c5a059;
          --flower-range-accent-dark: #a88b5c;
          --flower-range-track: #e8e0d8;
        }
        .flower-dual-range-track {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 6px;
          transform: translateY(-50%);
          border-radius: 999px;
          background: var(--flower-range-track);
          pointer-events: none;
        }
        .flower-dual-range-fill {
          position: absolute;
          left: 0;
          top: 50%;
          height: 6px;
          transform: translateY(-50%);
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            var(--flower-range-accent),
            var(--flower-range-accent-dark)
          );
          pointer-events: none;
        }
        .flower-dual-range-input {
          position: absolute;
          left: 0;
          width: 100%;
          height: 100%;
          top: 0;
          margin: 0;
          padding: 0;
          background: none;
          -webkit-appearance: none;
          appearance: none;
          pointer-events: none;
          outline: none;
        }
        .flower-dual-range-input::-webkit-slider-thumb {
          pointer-events: auto;
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--flower-range-accent);
          border: 2px solid #fdf9f4;
          box-shadow: 0 1px 4px rgba(44, 36, 32, 0.25);
          cursor: grab;
          /* WebKit: align thumb center with 6px track (thumb was sitting low) */
          margin-top: -7px;
        }
        .flower-dual-range-input::-webkit-slider-thumb:active {
          cursor: grabbing;
        }
        .flower-dual-range-input::-webkit-slider-runnable-track {
          height: 6px;
          background: transparent;
          border: none;
        }
        .flower-dual-range-input::-moz-range-thumb {
          pointer-events: auto;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--flower-range-accent);
          border: 2px solid #fdf9f4;
          box-shadow: 0 1px 4px rgba(44, 36, 32, 0.25);
          cursor: grab;
          /* Match WebKit vertical alignment on 6px track */
          margin-top: -7px;
        }
        .flower-dual-range-input::-moz-range-track {
          height: 6px;
          background: transparent;
          border: none;
        }
        .flower-filter-price-inputs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .flower-filter-baht {
          font-size: 13px;
          color: #5c4a3a;
        }
        .flower-filter-dash {
          color: #5c4a3a;
        }
        .flower-filter-input {
          flex: 1;
          min-width: 0;
          padding: 8px 10px;
          border: 1px solid #e8e0d8;
          border-radius: 8px;
          font-size: 13px;
          color: #5c4a3a;
          background: #fff;
        }
        .flower-swatch-grid {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          justify-content: flex-start;
        }
        .flower-swatch-wrap {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 0 0 auto;
        }
        .flower-swatch {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #e8e0d8;
          cursor: pointer;
          padding: 0;
        }
        .flower-swatch.is-active {
          outline: 2px solid #2c2420;
          outline-offset: 1px;
        }
        .flower-swatch-tip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 6px;
          padding: 4px 8px;
          background: #2c2420;
          color: #fff;
          font-size: 11px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
          z-index: 5;
        }
        .flower-swatch-wrap:hover .flower-swatch-tip {
          opacity: 1;
        }
        .flower-check-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .flower-check-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #5c4a3a;
          cursor: pointer;
          margin-bottom: 8px;
        }
        .flower-check-row input[type='checkbox'] {
          accent-color: #2c2420;
          width: 16px;
          height: 16px;
        }
        .flower-count-muted {
          font-size: 12px;
          color: #a8988c;
        }
        .flower-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .flower-pill-row--stem {
          flex-direction: column;
          align-items: stretch;
        }
        .flower-pill {
          border: 1px solid #e8e0d8;
          background: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          color: #5c4a3a;
          cursor: pointer;
          text-align: left;
        }
        .flower-pill.is-active {
          background: #f2c4c0;
          border-color: #e8a89e;
          color: #5c4a3a;
        }
      `}</style>
    </div>
  );
}

export function FlowerFilterSidebar(props: FlowerFilterPanelProps) {
  return (
    <aside className="flower-filter-sidebar-aside hidden lg:block">
      <FlowerFilterPanel {...props} />
      <style jsx>{`
        .flower-filter-sidebar-aside {
          width: 248px;
          flex-shrink: 0;
          height: 100%;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #e8e0d8 transparent;
          border-radius: 20px;
        }
        .flower-filter-sidebar-aside::-webkit-scrollbar {
          width: 4px;
        }
        .flower-filter-sidebar-aside::-webkit-scrollbar-track {
          background: transparent;
        }
        .flower-filter-sidebar-aside::-webkit-scrollbar-thumb {
          background: #e8e0d8;
          border-radius: 999px;
        }
      `}</style>
    </aside>
  );
}

export function FlowerFilterMobileDrawer({
  lang,
  isOpen,
  onClose,
  ...panelProps
}: FlowerFilterPanelProps & { isOpen: boolean; onClose: () => void }) {
  const tCat = translations[lang].catalog;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="flower-m-backdrop"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />
      <div
        id="filter-drawer"
        className="flower-m-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flower-m-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flower-m-sheet-chrome">
          <div className="flower-m-sheet-handle" aria-hidden />
          <div className="flower-m-toolbar">
            <button
              type="button"
              className="flower-m-close"
              onClick={onClose}
              aria-label={tCat.close}
            >
              ×
            </button>
            <h2 id="flower-m-title" className="flower-m-toolbar-title">
              {tCat.filters}
            </h2>
            <button type="button" className="flower-m-toolbar-clear" onClick={panelProps.onClear}>
              {tCat.clearAllFilters}
            </button>
          </div>
        </div>
        <div className="flower-m-scroll">
          <FlowerFilterPanel {...panelProps} lang={lang} mobileSheet />
        </div>
      </div>
      <style jsx>{`
        .flower-m-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(44, 36, 32, 0.45);
          z-index: 300;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .flower-m-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 301;
          display: flex;
          flex-direction: column;
          max-height: min(78vh, 560px);
          background: #fdf9f4;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -10px 40px rgba(44, 36, 32, 0.18);
          overflow: hidden;
          animation: sheetUp 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @keyframes sheetUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .flower-m-sheet-chrome {
          flex-shrink: 0;
          background: #fdf9f4;
          border-bottom: 1px solid #e8e0d8;
        }
        .flower-m-sheet-handle {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: #c9bfb4;
          margin: 10px auto 6px;
        }
        .flower-m-toolbar {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          align-items: center;
          gap: 6px;
          padding: 0 8px 12px;
          min-height: 44px;
        }
        .flower-m-close {
          width: 44px;
          height: 44px;
          border: none;
          background: rgba(232, 224, 216, 0.55);
          border-radius: 12px;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          color: #2c2420;
          display: flex;
          align-items: center;
          justify-content: center;
          justify-self: start;
        }
        .flower-m-close:active {
          background: rgba(232, 224, 216, 0.95);
        }
        .flower-m-toolbar-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #2c2420;
          text-align: center;
          line-height: 1.25;
          padding: 0 4px;
        }
        .flower-m-toolbar-clear {
          justify-self: end;
          font-size: 12px;
          font-weight: 500;
          color: #8a7a72;
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px 4px;
          text-align: right;
          line-height: 1.25;
          max-width: min(40vw, 140px);
        }
        .flower-m-toolbar-clear:active {
          color: #5c4a3a;
        }
        .flower-m-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      `}</style>
    </>
  );
}
