'use client';

import type { CheckoutHeaderCollapseMode } from '@/contexts/CheckoutStickyHeaderContext';
import { useSmartStickyHeader } from '@/hooks/useSmartStickyHeader';

type Options = {
  enabled: boolean;
  menuOpen: boolean;
  overlayOpen?: boolean;
  onModeChange?: (mode: CheckoutHeaderCollapseMode) => void;
};

/**
 * Cart-compact wrapper around the shared smart sticky header.
 * Collapse only after meaningful scroll down; restore on scroll up.
 */
export function useMobileCartHeaderCollapse({
  enabled,
  menuOpen,
  overlayOpen = false,
  onModeChange,
}: Options): CheckoutHeaderCollapseMode {
  const { collapseMode } = useSmartStickyHeader({
    variant: 'cart-compact',
    enabled,
    menuOpen,
    overlayOpen,
    onCollapseModeChange: onModeChange,
  });
  return collapseMode;
}
