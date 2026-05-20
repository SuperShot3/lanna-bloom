'use client';

export function SelectionTile({
  selected,
  title,
  subtitle,
  onClick,
  className = '',
  compact = false,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  className?: string;
  /** Tighter padding and type for dense grids (e.g. delivery time windows). */
  compact?: boolean;
}) {
  const rootClass = [
    'co-tile',
    selected ? 'co-tile--selected' : '',
    compact ? 'co-tile--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={rootClass}
      onClick={onClick}
      aria-pressed={selected}
    >
      {selected && (
        <span className="co-tile__check" aria-hidden>
          <svg
            width={compact ? 12 : 14}
            height={compact ? 12 : 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span className="co-tile__title">{title}</span>
      {subtitle && <span className="co-tile__sub">{subtitle}</span>}
      <style jsx>{`
        .co-tile {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 16px 14px;
          min-height: 72px;
          border-radius: 14px;
          border: 1.5px solid var(--border);
          background: #fff;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .co-tile--compact {
          gap: 2px;
          padding: 10px 10px;
          min-height: 0;
          border-radius: 12px;
        }
        .co-tile:hover {
          border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
        }
        .co-tile--selected {
          border-color: var(--checkout-option-selected-border);
          border-width: 2px;
          padding: 15px 13px;
          background: var(--checkout-option-selected-bg);
          box-shadow: var(--checkout-option-selected-ring);
        }
        .co-tile--compact.co-tile--selected {
          padding: 9px 9px;
        }
        .co-tile__check {
          position: absolute;
          top: 10px;
          right: 10px;
          color: var(--accent-border);
        }
        .co-tile--compact .co-tile__check {
          top: 7px;
          right: 7px;
        }
        .co-tile__title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          padding-right: 20px;
        }
        .co-tile--compact .co-tile__title {
          font-size: 14px;
          font-weight: 600;
          padding-right: 16px;
        }
        .co-tile__sub {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.3;
        }
        .co-tile--compact .co-tile__sub {
          font-size: 12px;
        }
      `}</style>
    </button>
  );
}

export function SuggestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="co-chip" onClick={onClick}>
      {label}
      <style jsx>{`
        .co-chip {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--pastel-cream) 80%, #fff);
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .co-chip:hover {
          border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
          background: var(--pastel-cream);
        }
      `}</style>
    </button>
  );
}
