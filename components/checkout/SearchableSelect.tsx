'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = '',
  disabled = false,
  required = false,
  ariaLabel,
  noResultsLabel = 'No matches',
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  noResultsLabel?: string;
}) {
  const reactId = useId();
  const listboxId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);
  const [typed, setTyped] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery(selectedLabel);
      setTyped(false);
    }
  }, [selectedLabel, open]);

  const optionKey = options.map((o) => o.value).join('\0');

  const filtered = useMemo(() => {
    if (!typed) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, typed]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = filtered.findIndex((o) => o.value === value);
    setHighlight(selectedIdx >= 0 ? selectedIdx : filtered.length > 0 ? 0 : -1);
    // optionKey keeps highlight stable across parent re-renders with the same options.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtered is derived from query/typed/options
  }, [open, query, typed, value, optionKey]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setTyped(false);
      setQuery(selectedLabel);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, selectedLabel]);

  useEffect(() => {
    if (!open) return;
    const el = rootRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open, filtered]);

  const openRef = useRef(open);
  openRef.current = open;

  const close = useCallback(() => {
    setOpen(false);
    setTyped(false);
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const selectOption = useCallback(
    (option: SearchableSelectOption) => {
      onChange(option.value);
      setQuery(option.label);
      setTyped(false);
      setOpen(false);
    },
    [onChange]
  );

  const openMenu = useCallback(() => {
    if (disabled) return;
    const alreadyOpen = openRef.current;
    setOpen(true);
    if (!alreadyOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.select();
      });
    }
  }, [disabled]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      if (filtered.length === 0) return;
      setHighlight((i) => (i < 0 ? 0 : (i + 1) % filtered.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      if (filtered.length === 0) return;
      setHighlight((i) => (i < 0 ? filtered.length - 1 : (i - 1 + filtered.length) % filtered.length));
      return;
    }
    if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      const option = filtered[highlight];
      if (option) selectOption(option);
    }
  };

  const activeId =
    open && highlight >= 0 && filtered[highlight]
      ? `${id}-opt-${highlight}-${reactId}`
      : undefined;

  return (
    <div
      ref={rootRef}
      className={`geo-select${open ? ' geo-select--open' : ''}${disabled ? ' geo-select--disabled' : ''}`}
    >
      <label className="geo-select__label" htmlFor={id}>
        {label}
        {required ? (
          <>
            {' '}
            <span className="geo-select__req" aria-hidden>
              *
            </span>
          </>
        ) : null}
      </label>
      <div className="geo-select__field">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-required={required || undefined}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setTyped(true);
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={openMenu}
          onClick={openMenu}
          onBlur={() => {
            requestAnimationFrame(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                close();
              }
            });
          }}
          onKeyDown={onKeyDown}
          className="geo-select__input"
        />
        <span className="geo-select__chevron" aria-hidden>
          <ChevronDown size={18} strokeWidth={2} />
        </span>
      </div>
      {open && !disabled ? (
        <ul id={listboxId} role="listbox" className="geo-select__list">
          {filtered.length === 0 ? (
            <li className="geo-select__empty" role="presentation">
              {noResultsLabel}
            </li>
          ) : (
            filtered.map((option, index) => {
              const selected = option.value === value;
              const highlighted = index === highlight;
              return (
                <li
                  key={option.value || `empty-${index}`}
                  id={`${id}-opt-${index}-${reactId}`}
                  role="option"
                  aria-selected={selected}
                  data-highlighted={highlighted ? 'true' : undefined}
                  className={`geo-select__option${selected ? ' geo-select__option--selected' : ''}${
                    highlighted ? ' geo-select__option--active' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(option);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {option.label}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
      <style jsx>{`
        .geo-select {
          position: relative;
          margin-top: 8px;
        }
        .geo-select__label {
          position: absolute;
          top: -7px;
          left: 14px;
          z-index: 2;
          padding: 0 6px;
          margin: 0;
          background: var(--surface);
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          color: var(--text-muted);
          pointer-events: none;
        }
        .geo-select__req {
          color: var(--accent);
        }
        .geo-select__field {
          position: relative;
        }
        .geo-select__input {
          width: 100%;
          padding: 12px 40px 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 16px;
          font-family: inherit;
          box-sizing: border-box;
          background: var(--surface);
          color: var(--text);
          -webkit-appearance: none;
          appearance: none;
        }
        .geo-select__input:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .geo-select--open .geo-select__input {
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }
        .geo-select--disabled .geo-select__input {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .geo-select__chevron {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          color: var(--text-muted);
          pointer-events: none;
        }
        .geo-select--open .geo-select__chevron {
          transform: translateY(-50%) rotate(180deg);
        }
        .geo-select__list {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 4px);
          z-index: 40;
          margin: 0;
          padding: 6px;
          list-style: none;
          max-height: 280px;
          overflow-y: auto;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(26, 60, 52, 0.12);
        }
        .geo-select__option {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 15px;
          line-height: 1.35;
          color: var(--text);
          cursor: pointer;
        }
        .geo-select__option--active {
          background: color-mix(in srgb, var(--accent-soft) 70%, var(--surface));
        }
        .geo-select__option--selected {
          font-weight: 600;
        }
        .geo-select__empty {
          padding: 10px 12px;
          font-size: 14px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
