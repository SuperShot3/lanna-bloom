'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Inline expand/collapse reveal for checkout panels (delivery date calendar, optional fields).
 * Uses global `.ui-overlay-reveal` styles in `app/globals.css`.
 */
export function OverlayReveal({
  open,
  children,
  className,
  hiddenWhenClosed = true,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  /** When true, sets aria-hidden and pointer-events off while closed. */
  hiddenWhenClosed?: boolean;
}) {
  return (
    <div
      className={cn('ui-overlay-reveal', open && 'ui-overlay-reveal--open', className)}
      aria-hidden={hiddenWhenClosed ? !open : undefined}
    >
      <div className="ui-overlay-reveal__inner">{children}</div>
    </div>
  );
}
