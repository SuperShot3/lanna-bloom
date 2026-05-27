'use client';

import { useState, type ReactNode } from 'react';

type Props = {
  label: string;
  helper?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function AdminCmsCollapsibleSection({
  label,
  helper,
  defaultOpen = true,
  className = '',
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`admin-cms-collapsible admin-cms-collapsible-section ${className}`.trim()}
    >
      <button
        type="button"
        className="admin-cms-collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-cms-collapsible-trigger-label">
          <span>{label}</span>
          {helper ? <span className="admin-cms-collapsible-trigger-helper">{helper}</span> : null}
        </span>
        <span
          className={`material-symbols-outlined admin-cms-sortable-chevron${open ? ' is-open' : ''}`}
          aria-hidden
        >
          chevron_right
        </span>
      </button>
      {open ? <div className="admin-cms-collapsible-body">{children}</div> : null}
    </div>
  );
}
