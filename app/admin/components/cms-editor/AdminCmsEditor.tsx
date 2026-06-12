'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

export function AdminCmsEditor({ children, className = '' }: Props) {
  return <div className={`admin-cms-editor ${className}`.trim()}>{children}</div>;
}
