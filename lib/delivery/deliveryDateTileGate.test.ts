/**
 * Pure helpers for delivery date tile gating (loading + constraint).
 * Run with: npx tsx lib/delivery/deliveryDateTileGate.test.ts
 */

import type { DeliveryConstraint } from './deliveryConstraints';
import { getSelectableDeliveryTimeSlotsForDate } from '@/lib/deliveryTimeSelection';
import { addDaysToYmd, getBangkokYmd } from '@/lib/deliveryHours';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

/** Mirrors DeliveryDateSelector todaySelectable logic. */
function isTodayTileSelectable(
  todayStr: string,
  constraint: DeliveryConstraint | null,
  constraintLoading: boolean,
  now: Date
): boolean {
  const orderingBlocked = constraint != null && !constraint.orderingAllowed;
  return (
    !constraintLoading &&
    !orderingBlocked &&
    getSelectableDeliveryTimeSlotsForDate(todayStr, now, constraint).length > 0
  );
}

/** Mirrors SameDayCutoffBanner visibility in PremiumCheckoutFlow. */
function shouldShowSameDayCutoffBanner(
  variant: 'chiang-mai' | 'expansion',
  constraint: DeliveryConstraint | null,
  constraintLoading: boolean,
  todayYmd: string
): boolean {
  if (variant !== 'chiang-mai') return false;
  if (constraintLoading) return false;
  if (constraint?.orderingAllowed === false) return false;
  if (constraint?.earliestYmd && constraint.earliestYmd > todayYmd) return false;
  return true;
}

const tenAmBangkok = new Date('2026-07-08T03:00:00.000Z');
const today = getBangkokYmd(tenAmBangkok);
const tomorrow = addDaysToYmd(today, 1);

const sameDayOk: DeliveryConstraint = {
  orderingAllowed: true,
  earliestYmd: today,
  sameDayCutoffLocal: null,
  reasonCode: 'ok',
  customerMessageEn: null,
  customerMessageTh: null,
  deliveryLimitationsEn: null,
  deliveryLimitationsTh: null,
};

const nextDayOnly: DeliveryConstraint = {
  ...sameDayOk,
  earliestYmd: tomorrow,
  reasonCode: 'product_next_day',
};

// Loading: Today disabled even if unconstrained
assert(
  isTodayTileSelectable(today, null, true, tenAmBangkok) === false,
  'loading disables Today'
);

// Loaded + same-day: Today enabled
assert(
  isTodayTileSelectable(today, sameDayOk, false, tenAmBangkok) === true,
  'same-day allows Today'
);

// Loaded + next-day floor: Today disabled
assert(
  isTodayTileSelectable(today, nextDayOnly, false, tenAmBangkok) === false,
  'next-day floor disables Today'
);

// Banner: hide while loading / next-day / show for CM same-day
assert(
  shouldShowSameDayCutoffBanner('chiang-mai', sameDayOk, true, today) === false,
  'banner hidden while loading'
);
assert(
  shouldShowSameDayCutoffBanner('chiang-mai', nextDayOnly, false, today) === false,
  'banner hidden when earliest > today'
);
assert(
  shouldShowSameDayCutoffBanner('chiang-mai', sameDayOk, false, today) === true,
  'banner shown for CM same-day'
);
assert(
  shouldShowSameDayCutoffBanner('expansion', sameDayOk, false, today) === false,
  'banner hidden for expansion'
);

console.log('deliveryDateTileGate.test.ts: all passed');
