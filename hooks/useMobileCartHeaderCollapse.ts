'use client';

import { useEffect, useRef, useState } from 'react';
import type { CheckoutHeaderCollapseMode } from '@/contexts/CheckoutStickyHeaderContext';

/** Scroll down at least this much before collapsing (px). */
const SCROLL_DOWN_TO_COLLAPSE = 72;
/** Ignore per-frame scroll deltas smaller than this (px). */
const SCROLL_IGNORE_DELTA = 6;
/** Show full header only when the user returns near top (px). */
const SHOW_FULL_AT_TOP_PX = 96;
/** Require enough page depth before allowing compact mode (px). */
const MIN_SCROLL_Y_FOR_COMPACT = 96;
/** Prevent rapid toggles between modes (ms) — align with compact header CSS animation. */
const MODE_SWITCH_COOLDOWN_MS = 520;

type Options = {
  enabled: boolean;
  menuOpen: boolean;
  onModeChange?: (mode: CheckoutHeaderCollapseMode) => void;
};

/**
 * Threshold-based mobile cart header: collapse only after meaningful scroll down,
 * expand only after meaningful scroll up. Ignores tiny touch jitter.
 */
export function useMobileCartHeaderCollapse({
  enabled,
  menuOpen,
  onModeChange,
}: Options): CheckoutHeaderCollapseMode {
  const [mode, setMode] = useState<CheckoutHeaderCollapseMode>('expanded');
  const modeRef = useRef<CheckoutHeaderCollapseMode>('expanded');
  const lastScrollYRef = useRef(0);
  const downAccumRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastModeSwitchAtRef = useRef(0);
  const enabledRef = useRef(enabled);
  const menuOpenRef = useRef(menuOpen);
  const onModeChangeRef = useRef(onModeChange);

  enabledRef.current = enabled;
  menuOpenRef.current = menuOpen;
  onModeChangeRef.current = onModeChange;

  const applyMode = (next: CheckoutHeaderCollapseMode) => {
    if (modeRef.current === next) return;
    const now = performance.now();
    if (now - lastModeSwitchAtRef.current < MODE_SWITCH_COOLDOWN_MS) return;
    lastModeSwitchAtRef.current = now;
    modeRef.current = next;
    setMode(next);
    onModeChangeRef.current?.(next);
  };

  useEffect(() => {
    if (!menuOpen || !enabledRef.current) return;
    downAccumRef.current = 0;
    lastModeSwitchAtRef.current = 0;
    applyMode('expanded');
  }, [menuOpen]);

  useEffect(() => {
    if (!enabled) {
      downAccumRef.current = 0;
      lastModeSwitchAtRef.current = 0;
      applyMode('expanded');
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      lastModeSwitchAtRef.current = 0;
      applyMode('expanded');
      return;
    }

    lastScrollYRef.current = window.scrollY;

    const processScroll = () => {
      rafIdRef.current = null;
      if (!enabledRef.current) return;

      if (menuOpenRef.current) {
        downAccumRef.current = 0;
        lastModeSwitchAtRef.current = 0;
        applyMode('expanded');
        lastScrollYRef.current = window.scrollY;
        return;
      }

      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      if (y <= SHOW_FULL_AT_TOP_PX) {
        downAccumRef.current = 0;
        lastModeSwitchAtRef.current = 0;
        applyMode('expanded');
        return;
      }

      if (Math.abs(delta) < SCROLL_IGNORE_DELTA) return;

      if (delta > 0) {
        downAccumRef.current += delta;
        if (
          modeRef.current === 'expanded' &&
          y >= MIN_SCROLL_Y_FOR_COMPACT &&
          downAccumRef.current >= SCROLL_DOWN_TO_COLLAPSE
        ) {
          downAccumRef.current = 0;
          applyMode('compact');
        }
      } else {
        downAccumRef.current = 0;
      }
    };

    const onScroll = () => {
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(processScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      downAccumRef.current = 0;
      lastModeSwitchAtRef.current = 0;
      applyMode('expanded');
    };
  }, [enabled]);

  return mode;
}
