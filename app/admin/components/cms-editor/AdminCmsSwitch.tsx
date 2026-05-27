'use client';

type Props = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function AdminCmsSwitch({ id, label, checked, onChange, disabled }: Props) {
  return (
    <label className={`admin-cms-switch${disabled ? ' is-disabled' : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="admin-cms-switch-track" aria-hidden />
      <span className="admin-cms-switch-label">{label}</span>
    </label>
  );
}
