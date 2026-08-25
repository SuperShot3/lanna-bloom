export const SMART_STICKY = {
  /** Ignore per-frame deltas smaller than this (px). */
  ignoreDeltaPx: 8,
  /** Accumulated downward travel before hiding (px). */
  hideAfterDownPx: 56,
  /** Upward travel before showing again (px). */
  showAfterUpPx: 8,
  /** Always show when the user is this close to the top (px). */
  showAtTopPx: 48,
  /** Do not hide until the page has been scrolled at least this far (px). */
  minYToHidePx: 48,
  /** Glass / denser desktop chrome after this scroll (px). */
  scrolledPx: 16,
  /** Extra jitter guard when hiding only (ms). Show is never delayed. */
  hideCooldownMs: 180,
  cartHideAfterDownPx: 72,
  cartMinYToCompactPx: 64,
} as const;

export type CollapseMode = 'expanded' | 'compact';
export type StickyVariant = 'hide' | 'cart-compact';

export type SmartStickyState = {
  hidden: boolean;
  collapseMode: CollapseMode;
  isScrolled: boolean;
  downAccum: number;
  lastY: number;
  lastHideAt: number;
};

export type SmartStickyTick = {
  y: number;
  now: number;
  menuOpen: boolean;
  overlayOpen: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  variant: StickyVariant;
};

export function createSmartStickyState(y = 0): SmartStickyState {
  return {
    hidden: false,
    collapseMode: 'expanded',
    isScrolled: y > SMART_STICKY.scrolledPx,
    downAccum: 0,
    lastY: y,
    lastHideAt: 0,
  };
}

function revealed(state: SmartStickyState, y: number, nowIgnored?: number): SmartStickyState {
  return {
    hidden: false,
    collapseMode: 'expanded',
    isScrolled: y > SMART_STICKY.scrolledPx,
    downAccum: 0,
    lastY: y,
    lastHideAt: nowIgnored ?? state.lastHideAt,
  };
}

/**
 * Directional sticky-header state machine. Pure so it can be unit-tested
 * without a DOM. Hide on meaningful scroll down; show immediately on scroll up.
 */
export function tickSmartSticky(state: SmartStickyState, tick: SmartStickyTick): SmartStickyState {
  const y = Math.max(0, tick.y);
  const isScrolled = y > SMART_STICKY.scrolledPx;

  if (tick.reducedMotion || tick.menuOpen || tick.overlayOpen) {
    return revealed(state, y, 0);
  }

  if (y <= SMART_STICKY.showAtTopPx) {
    return revealed(state, y, 0);
  }

  const delta = y - state.lastY;
  const next: SmartStickyState = {
    ...state,
    isScrolled,
    lastY: y,
  };

  if (Math.abs(delta) < SMART_STICKY.ignoreDeltaPx) {
    return next;
  }

  if (delta < 0) {
    next.downAccum = 0;
    if (-delta >= SMART_STICKY.showAfterUpPx) {
      next.hidden = false;
      next.collapseMode = 'expanded';
    }
    return next;
  }

  next.downAccum = state.downAccum + delta;
  const hideAfter =
    tick.variant === 'cart-compact'
      ? SMART_STICKY.cartHideAfterDownPx
      : SMART_STICKY.hideAfterDownPx;
  const minY =
    tick.variant === 'cart-compact' ? SMART_STICKY.cartMinYToCompactPx : SMART_STICKY.minYToHidePx;
  const cooled = tick.now - state.lastHideAt >= SMART_STICKY.hideCooldownMs;
  const alreadyAway =
    tick.variant === 'cart-compact' && tick.isMobile
      ? state.collapseMode === 'compact'
      : state.hidden;

  if (!alreadyAway && cooled && y >= minY && next.downAccum >= hideAfter) {
    next.downAccum = 0;
    next.lastHideAt = tick.now;
    if (tick.variant === 'cart-compact' && tick.isMobile) {
      next.collapseMode = 'compact';
      next.hidden = false;
    } else {
      next.hidden = true;
      next.collapseMode = 'expanded';
    }
  }

  return next;
}
