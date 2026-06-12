'use client';

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  showBulkActions?: boolean;
  idPrefix: string;
};

export function AdminCheckboxGrid({
  options,
  selected,
  onChange,
  showBulkActions = false,
  idPrefix,
}: Props) {
  const selectedSet = new Set(selected);

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function selectAll() {
    onChange(options.map((o) => o.value));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="admin-cms-checkbox-grid-wrap">
      {showBulkActions ? (
        <div className="admin-cms-checkbox-bulk">
          <button type="button" className="admin-cms-link-btn" onClick={selectAll}>
            Select all
          </button>
          <span className="admin-cms-checkbox-bulk-sep" aria-hidden>
            ·
          </span>
          <button type="button" className="admin-cms-link-btn" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}
      <div className="admin-cms-checkbox-grid" role="group">
        {options.map((option) => {
          const inputId = `${idPrefix}-${option.value}`;
          return (
            <label key={option.value} className="admin-cms-checkbox" htmlFor={inputId}>
              <input
                id={inputId}
                type="checkbox"
                checked={selectedSet.has(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
