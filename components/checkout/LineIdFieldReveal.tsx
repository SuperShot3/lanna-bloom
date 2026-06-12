'use client';

import type { ReactNode } from 'react';

import { OverlayReveal } from '@/components/ui/overlay-reveal';

export function LineIdFieldReveal({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return <OverlayReveal open={open}>{children}</OverlayReveal>;
}
