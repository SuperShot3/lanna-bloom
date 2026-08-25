/**
 * Run: npx tsx lib/header/smartStickyHeader.test.ts
 */
import assert from 'node:assert/strict';
import {
  SMART_STICKY,
  createSmartStickyState,
  tickSmartSticky,
  type SmartStickyState,
  type SmartStickyTick,
} from '@/lib/header/smartStickyHeader';

function tick(
  state: SmartStickyState,
  y: number,
  extras: Partial<SmartStickyTick> = {}
): SmartStickyState {
  return tickSmartSticky(state, {
    y,
    now: extras.now ?? 1_000,
    menuOpen: false,
    overlayOpen: false,
    isMobile: true,
    reducedMotion: false,
    variant: 'hide',
    ...extras,
  });
}

let state = createSmartStickyState(0);
assert.equal(state.hidden, false);
assert.equal(state.collapseMode, 'expanded');
assert.equal(state.isScrolled, false);

state = tick(state, 20);
assert.equal(state.isScrolled, true);
assert.equal(state.hidden, false);

state = tick(state, 20 + SMART_STICKY.ignoreDeltaPx - 1);
assert.equal(state.hidden, false, 'tiny accidental deltas must not hide');

state = createSmartStickyState(0);
state = tick(state, 80);
state = tick(state, 80 + SMART_STICKY.hideAfterDownPx, { now: 2_000 });
assert.equal(state.hidden, true, 'accumulated downward travel hides the header');
assert.equal(state.collapseMode, 'expanded');

state = tick(state, state.lastY - SMART_STICKY.showAfterUpPx, { now: 2_010 });
assert.equal(state.hidden, false, 'scroll up must show immediately without cooldown');

state = createSmartStickyState(0);
state = tick(state, SMART_STICKY.showAtTopPx);
assert.equal(state.hidden, false);

state = createSmartStickyState(60);
state = tick(state, 80, { now: 3_000 });
assert.equal(state.hidden, false, 'short downward travel must not hide yet');
state = tick(state, 120, { now: 4_000 });
assert.equal(state.hidden, true, 'accumulated downward travel then hides');

state = createSmartStickyState(120);
state = tick(state, 120 + SMART_STICKY.hideAfterDownPx, { now: 4_000, isMobile: false });
assert.equal(state.hidden, false, 'desktop must never hide');

state = createSmartStickyState(120);
state = tick(state, 120 + SMART_STICKY.hideAfterDownPx, { now: 5_000, reducedMotion: true });
assert.equal(state.hidden, false, 'reduced motion keeps the header visible');

state = createSmartStickyState(120);
state = tick(state, 200, { now: 6_000, menuOpen: true });
assert.equal(state.hidden, false);
state = tick(state, 280, { now: 6_100, overlayOpen: true });
assert.equal(state.hidden, false);

state = createSmartStickyState(0);
state = tick(state, 80, { variant: 'cart-compact' });
state = tick(state, 80 + SMART_STICKY.cartHideAfterDownPx, {
  now: 7_000,
  variant: 'cart-compact',
});
assert.equal(state.hidden, false, 'cart compact must not fully hide the chrome');
assert.equal(state.collapseMode, 'compact');

state = tick(state, state.lastY - SMART_STICKY.showAfterUpPx, {
  now: 7_010,
  variant: 'cart-compact',
});
assert.equal(state.collapseMode, 'expanded', 'cart compact restores on scroll up');

console.log('smartStickyHeader.test.ts: all passed');
