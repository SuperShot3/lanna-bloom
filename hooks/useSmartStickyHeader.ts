'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { CheckoutHeaderCollapseMode } from '@/contexts/CheckoutStickyHeaderContext';
import {
  createSmartStickyState,
  tickSmartSticky,
  type SmartStickyState,
  type StickyVariant,
} from '@/lib/header/smartStickyHeader';

const MOBILE_MQ = '(max-width: 767px)';
const REDUCE_MQ = '(prefers-reduced-motion: reduce)';

export type SmartStickyHeaderResult = {
  hidden: boolean;
  isScrolled: boolean;
  collapseMode: CheckoutHeaderCollapseMode;
  isMobile: boolean;
};

type Options = {
  variant: StickyVariant;
  enabled?: boolean;
  menuOpen: boolean;
  overlayOpen: boolean;
  onCollapseModeChange?: (mode: CheckoutHeaderCollapseMode) => void;
};

function publishIfChanged(
  prev: Pick<SmartStickyState, 'hidden' | 'collapseMode' | 'isScrolled'>,
  next: SmartStickyState,
  setHidden: (v: boolean) => void,
  setIsScrolled: (v: boolean) => void,
  setCollapseMode: (v: CheckoutHeaderCollapseMode) => void,
  onCollapseModeChange?: (mode: CheckoutHeaderCollapseMode) => void
): Pick<SmartStickyState, 'hidden' | 'collapseMode' | 'isScrolled'> {
  if (prev.hidden !== next.hidden) setHidden(next.hidden);
  if (prev.isScrolled !== next.isScrolled) setIsScrolled(next.isScrolled);
  if (prev.collapseMode !== next.collapseMode) {
    setCollapseMode(next.collapseMode);
    onCollapseModeChange?.(next.collapseMode);
  }
  return {
    hidden: next.hidden,
    collapseMode: next.collapseMode,
    isScrolled: next.isScrolled,
  };
}

/**
 * rAF-batched hide-on-scroll-down / show-on-scroll-up header state.
 * Desktop never hides. Cart compact swaps chrome instead of translating away.
 */
export function useSmartStickyHeader({
  variant,
  enabled = true,
  menuOpen,
  overlayOpen,
  onCollapseModeChange,
}: Options): SmartStickyHeaderResult {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [collapseMode, setCollapseMode] = useState<CheckoutHeaderCollapseMode>('expanded');
  const [isMobile, setIsMobile] = useState(false);

  const stateRef = useRef<SmartStickyState>(createSmartStickyState(0));
  const publishedRef = useRef<Pick<SmartStickyState, 'hidden' | 'collapseMode' | 'isScrolled'>>({
    hidden: false,
    collapseMode: 'expanded',
    isScrolled: false,
  });
  const rafIdRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const menuOpenRef = useRef(menuOpen);
  const overlayOpenRef = useRef(overlayOpen);
  const variantRef = useRef(variant);
  const isMobileRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const onCollapseModeChangeRef = useRef(onCollapseModeChange);

  enabledRef.current = enabled;
  menuOpenRef.current = menuOpen;
  overlayOpenRef.current = overlayOpen;
  variantRef.current = variant;
  onCollapseModeChangeRef.current = onCollapseModeChange;

  const apply = (next: SmartStickyState) => {
    stateRef.current = next;
    publishedRef.current = publishIfChanged(
      publishedRef.current,
      next,
      setHidden,
      setIsScrolled,
      setCollapseMode,
      onCollapseModeChangeRef.current
    );
  };

  const process = () => {
    rafIdRef.current = null;
    const y = window.scrollY;
    if (!enabledRef.current) {
      apply(createSmartStickyState(y));
      return;
    }
    apply(
      tickSmartSticky(stateRef.current, {
        y,
        now: performance.now(),
        menuOpen: menuOpenRef.current,
        overlayOpen: overlayOpenRef.current,
        isMobile: isMobileRef.current,
        reducedMotion: reducedMotionRef.current,
        variant: variantRef.current,
      })
    );
  };

  const schedule = () => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(process);
    }
  };

  useEffect(() => {
    const mobileMq = window.matchMedia(MOBILE_MQ);
    const reduceMq = window.matchMedia(REDUCE_MQ);
    const syncQueries = () => {
      isMobileRef.current = mobileMq.matches;
      reducedMotionRef.current = reduceMq.matches;
      setIsMobile(mobileMq.matches);
      schedule();
    };
    syncQueries();
    stateRef.current = createSmartStickyState(window.scrollY);
    apply(stateRef.current);

    window.addEventListener('scroll', schedule, { passive: true });
    mobileMq.addEventListener('change', syncQueries);
    reduceMq.addEventListener('change', syncQueries);
    return () => {
      window.removeEventListener('scroll', schedule);
      mobileMq.removeEventListener('change', syncQueries);
      reduceMq.removeEventListener('change', syncQueries);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    // Mount-only listener; inputs are read from refs inside process().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stateRef.current = createSmartStickyState(typeof window === 'undefined' ? 0 : window.scrollY);
    apply(stateRef.current);
    // Reset hide/compact when the route or variant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, variant, enabled]);

  useEffect(() => {
    if (!menuOpen && !overlayOpen) return;
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, overlayOpen]);

  return { hidden, isScrolled, collapseMode, isMobile };
}
