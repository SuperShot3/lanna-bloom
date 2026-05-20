'use client';

import type { ReactNode } from 'react';

export function PhoneCountrySelect({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  className = 'co-phone-cc',
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  options: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      className={`${className} co-phone-cc--flag-only`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      {options}
      <style jsx global>{`
        select.co-phone-cc--flag-only {
          width: 76px;
          min-width: 76px;
          max-width: 76px;
          max-height: 48px;
          padding: 12px 8px;
          font-size: 22px;
          line-height: 1;
          text-align: center;
          flex-shrink: 0;
          border: none;
          background: var(--pastel-cream);
          cursor: pointer;
          box-sizing: border-box;
          overflow: hidden;
        }
      `}</style>
    </select>
  );
}
