'use client';

type ChipOption = { value: string; label: string; icon?: string };

type ChipsProps = {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
  /** When set, extra chips cannot be selected until another is deselected. */
  maxSelected?: number;
};

export function Chips({ options, selected, onToggle, multi = true, maxSelected }: ChipsProps) {
  return (
    <div className="partner-chips">
      {options.map((o) => {
        const active = multi ? selected.includes(o.value) : selected[0] === o.value;
        const atLimit =
          multi &&
          maxSelected != null &&
          selected.length >= maxSelected &&
          !active;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              if (atLimit) return;
              onToggle(o.value);
            }}
            disabled={atLimit}
            className={`partner-chip ${active ? 'active' : ''} ${atLimit ? 'partner-chip--disabled' : ''}`}
          >
            {o.icon && <span>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
