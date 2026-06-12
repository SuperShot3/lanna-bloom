'use client';

type SelProps = {
  label: string;
  sub?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
};

export function Sel({ label, sub, options, value, onChange, required }: SelProps) {
  return (
    <div className="partner-sel">
      <label>
        {label}
        {required && <span className="partner-inp-req"> *</span>}
        {sub && <span className="partner-inp-sub">{sub}</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
