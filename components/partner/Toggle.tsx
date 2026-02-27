'use client';

type ToggleProps = {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

export function Toggle({ label, sub, value, onChange }: ToggleProps) {
  return (
    <div className="partner-toggle" onClick={() => onChange(!value)}>
      <div>
        <div className="partner-toggle-label">{label}</div>
        {sub && <div className="partner-toggle-sub">{sub}</div>}
      </div>
      <div className={`partner-toggle-switch ${value ? 'on' : ''}`}>
        <div className="partner-toggle-knob" />
      </div>
    </div>
  );
}
