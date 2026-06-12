'use client';

import type { ReactNode } from 'react';

/**
 * Fixed-size Material Symbols wrapper — hides ligature overflow until the icon font loads.
 */
export function MaterialSymbol({
  children,
  className = '',
  filled = false,
}: {
  children: ReactNode;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' material-symbols-filled' : ''} ${className}`.trim()}
      aria-hidden
    >
      {children}
    </span>
  );
}
