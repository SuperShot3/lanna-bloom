'use client';

type InpProps = {
  label: string;
  sub?: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  required?: boolean;
};

export function Inp({
  label,
  sub,
  hint,
  placeholder,
  value,
  onChange,
  type = 'text',
  required,
}: InpProps) {
  return (
    <div className="partner-inp">
      <label>
        {label}
        {required && <span className="partner-inp-req"> *</span>}
        {sub && <span className="partner-inp-sub">{sub}</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {hint && <p className="partner-inp-hint">{hint}</p>}
    </div>
  );
}
