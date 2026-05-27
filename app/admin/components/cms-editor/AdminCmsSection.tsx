'use client';

import type { ReactNode } from 'react';

type Props = {
  label: string;
  helper?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminCmsSection({ label, helper, actions, children, className = '' }: Props) {
  return (
    <section className={`admin-cms-section ${className}`.trim()}>
      <div className="admin-cms-section-header">
        <div>
          <h3 className="admin-cms-section-label">{label}</h3>
          {helper ? <p className="admin-cms-section-helper">{helper}</p> : null}
        </div>
        {actions ? <div className="admin-cms-section-actions">{actions}</div> : null}
      </div>
      <div className="admin-cms-section-body">{children}</div>
    </section>
  );
}
