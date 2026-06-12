'use client';

type Option = { value: string; label: string };

type Props = {
  id: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function AdminCmsSelect({ id, value, options, onChange, disabled }: Props) {
  return (
    <select
      id={id}
      className="admin-cms-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
