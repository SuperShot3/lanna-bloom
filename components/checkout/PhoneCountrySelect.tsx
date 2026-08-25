'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import {
  countryDialFlag,
  countryDialGroupLabels,
  countryDialTriggerText,
  findCountryByDialCode,
  type CountryCodeEntry,
} from '@/lib/checkout/phoneCountryDial';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type PanelPos = { top: number; left: number; width: number };

export function PhoneCountrySelect({
  id,
  value,
  onChange,
  popular,
  all,
  lang,
  ariaLabel,
  className = 'co-phone-cc',
  display = 'full',
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  popular: CountryCodeEntry[];
  all: CountryCodeEntry[];
  lang: Locale;
  ariaLabel: string;
  className?: string;
  /** `flag` shows emoji only; `full` shows flag + dial code (e.g. "🇹🇭 +66"). */
  display?: 'flag' | 'full';
}) {
  const reactId = useId();
  const listboxId = `${id ?? 'phone-cc'}-listbox`;
  const triggerId = id ?? `phone-cc-${reactId}`;
  const searchId = `${triggerId}-search`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { popular: popularLabel, all: allLabel } = countryDialGroupLabels(lang);
  const searchPlaceholder =
    lang === 'th' ? 'ค้นหาประเทศ' : lang === 'ru' ? 'Поиск страны' : 'Search country';
  const noResultsLabel =
    lang === 'th' ? 'ไม่พบประเทศ' : lang === 'ru' ? 'Страна не найдена' : 'No matches';

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const found = findCountryByDialCode(value, popular, all);
    return found?.id ?? null;
  });

  useEffect(() => {
    const current =
      (selectedId &&
        (popular.find((c) => c.id === selectedId) ?? all.find((c) => c.id === selectedId))) ||
      null;
    if (current && current.code === value) return;
    const next = findCountryByDialCode(value, popular, all);
    setSelectedId(next?.id ?? null);
  }, [value, popular, all, selectedId]);

  const selected =
    (selectedId &&
      (popular.find((c) => c.id === selectedId) ?? all.find((c) => c.id === selectedId))) ||
    findCountryByDialCode(value, popular, all);

  const triggerFlag = selected ? countryDialFlag(selected.label) : '🌐';
  const triggerText =
    display === 'full' ? countryDialTriggerText(selected, value) : triggerFlag;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredPopular = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return popular;
    return popular.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        `+${c.code}`.includes(q)
    );
  }, [popular, query]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        `+${c.code}`.includes(q)
    );
  }, [all, query]);

  const flatFiltered = useMemo(
    () => [...filteredPopular, ...filteredAll],
    [filteredPopular, filteredAll]
  );
  const flatKey = flatFiltered.map((c) => c.id).join('\0');

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 280), window.innerWidth - 16);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPanelPos({
      top: r.bottom + 4,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPos();
    const onReposition = () => updatePanelPos();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return;
    const idx = flatFiltered.findIndex((c) => c.id === selected?.id);
    setHighlight(idx >= 0 ? idx : flatFiltered.length > 0 ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, selected?.id, flatKey]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open, flatKey]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const selectEntry = useCallback(
    (entry: CountryCodeEntry) => {
      setSelectedId(entry.id);
      onChange(entry.code);
      setQuery('');
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const toggleOpen = () => {
    if (open) {
      close();
      return;
    }
    setQuery('');
    setOpen(true);
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatFiltered.length === 0) return;
      setHighlight((i) => (i < 0 ? 0 : (i + 1) % flatFiltered.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatFiltered.length === 0) return;
      setHighlight((i) =>
        i < 0 ? flatFiltered.length - 1 : (i - 1 + flatFiltered.length) % flatFiltered.length
      );
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const entry = flatFiltered[highlight];
      if (entry) selectEntry(entry);
    }
  };

  const activeId =
    open && highlight >= 0 && flatFiltered[highlight]
      ? `${triggerId}-opt-${highlight}-${reactId}`
      : undefined;

  const renderOption = (entry: CountryCodeEntry, index: number) => {
    const isSelected = entry.id === selected?.id;
    const highlighted = index === highlight;
    return (
      <li
        key={entry.id}
        id={`${triggerId}-opt-${index}-${reactId}`}
        role="option"
        aria-selected={isSelected}
        data-highlighted={highlighted ? 'true' : undefined}
        className={cn(
          'phone-cc-select__option',
          isSelected && 'phone-cc-select__option--selected',
          highlighted && 'phone-cc-select__option--active'
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          selectEntry(entry);
        }}
        onMouseEnter={() => setHighlight(index)}
      >
        {entry.label}
      </li>
    );
  };

  const panelStyle: CSSProperties | undefined = panelPos
    ? {
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        width: panelPos.width,
        zIndex: 300,
      }
    : undefined;

  const panel =
    open && mounted && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            className="phone-cc-select__panel"
            style={panelStyle}
            role="presentation"
          >
            <input
              ref={searchRef}
              id={searchId}
              type="text"
              className="phone-cc-select__search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <ul id={listboxId} role="listbox" className="phone-cc-select__list" aria-label={ariaLabel}>
              {flatFiltered.length === 0 ? (
                <li className="phone-cc-select__empty" role="presentation">
                  {noResultsLabel}
                </li>
              ) : (
                <>
                  {filteredPopular.length > 0 ? (
                    <li className="phone-cc-select__group" role="presentation">
                      {popularLabel}
                    </li>
                  ) : null}
                  {filteredPopular.map((entry, i) => renderOption(entry, i))}
                  {filteredAll.length > 0 ? (
                    <li className="phone-cc-select__group" role="presentation">
                      {allLabel}
                    </li>
                  ) : null}
                  {filteredAll.map((entry, i) =>
                    renderOption(entry, filteredPopular.length + i)
                  )}
                </>
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        'phone-cc-select',
        open && 'phone-cc-select--open',
        display === 'flag' && 'phone-cc-select--flag',
        display === 'full' && 'phone-cc-select--full',
        className
      )}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="phone-cc-select__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={toggleOpen}
      >
        <span className="phone-cc-select__trigger-text">{triggerText}</span>
        <ChevronDown className="phone-cc-select__chevron" size={14} strokeWidth={2} aria-hidden />
      </button>
      {panel}

      <style jsx global>{`
        .phone-cc-select {
          position: relative;
          flex: 0 0 auto;
          align-self: stretch;
          display: flex;
          width: 5.75rem;
          min-width: 5.75rem;
          max-width: 5.75rem;
        }
        .phone-cc-select--flag {
          width: 4.75rem;
          min-width: 4.75rem;
          max-width: 4.75rem;
        }
        .phone-cc-select__trigger {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          width: 100%;
          height: 100%;
          min-height: 48px;
          margin: 0;
          padding: 10px 8px 10px 10px;
          border: none;
          border-right: 1px solid var(--border);
          border-radius: 12px 0 0 12px;
          background: var(--pastel-cream);
          color: var(--text);
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 600;
          line-height: 1.2;
          cursor: pointer;
          box-sizing: border-box;
        }
        .phone-cc-select--flag .phone-cc-select__trigger {
          justify-content: center;
          font-size: 22px;
          font-weight: 400;
          padding: 10px 6px;
        }
        .phone-cc-select__trigger:focus {
          outline: none;
        }
        .phone-cc-select__trigger:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }
        .phone-cc-select__trigger-text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .phone-cc-select__chevron {
          flex-shrink: 0;
          opacity: 0.55;
          color: var(--text-muted);
        }
        .phone-cc-select--open .phone-cc-select__chevron {
          transform: rotate(180deg);
        }
        .phone-cc-select__panel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 10px 28px rgba(26, 60, 52, 0.16);
          box-sizing: border-box;
        }
        .phone-cc-select__search {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
          font-size: 16px;
          box-sizing: border-box;
        }
        .phone-cc-select__search:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .phone-cc-select__list {
          margin: 0;
          padding: 0;
          list-style: none;
          max-height: min(280px, 45vh);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .phone-cc-select__group {
          padding: 8px 12px 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .phone-cc-select__option {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 15px;
          line-height: 1.35;
          color: var(--text);
          cursor: pointer;
        }
        .phone-cc-select__option--active {
          background: color-mix(in srgb, var(--accent-soft) 70%, var(--surface));
        }
        .phone-cc-select__option--selected {
          font-weight: 600;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .phone-cc-select__option--selected.phone-cc-select__option--active {
          background: color-mix(in srgb, var(--accent-soft) 85%, var(--accent));
        }
        .phone-cc-select__empty {
          padding: 10px 12px;
          font-size: 14px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
