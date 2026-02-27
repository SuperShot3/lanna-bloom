'use client';

type ChipOption = { value: string; label: string; icon?: string };

type ChipsProps = {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
};

export function Chips({ options, selected, onToggle, multi = true }: ChipsProps) {
  return (
    <div className="partner-chips">
      {options.map((o) => {
        const active = multi ? selected.includes(o.value) : selected[0] === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`partner-chip ${active ? 'active' : ''}`}
          >
            {o.icon && <span>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
