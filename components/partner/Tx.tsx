'use client';

type TxProps = {
  label: string;
  sub?: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  rows?: number;
};

export function Tx({
  label,
  sub,
  hint,
  placeholder,
  value,
  onChange,
  required,
  rows = 4,
}: TxProps) {
  return (
    <div className="partner-inp">
      <label>
        {label}
        {required && <span className="partner-inp-req"> *</span>}
        {sub && <span className="partner-inp-sub">{sub}</span>}
      </label>
      <textarea
        className="partner-tx"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
      />
      {hint && <p className="partner-inp-hint">{hint}</p>}
    </div>
  );
}
