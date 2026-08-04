/**
 * Mother's Day 2026 MOM10 promo tests.
 * Run with: npx tsx lib/promo/mothersDay2026Promo.test.ts
 */

import {
  evaluateMothersDay2026Promo,
  isMothersDay2026PromoActive,
  mothersDay2026PromoDiscount,
  MOTHERS_DAY_2026_PROMO_CODE,
  MOTHERS_DAY_2026_PROMO_END_YMD,
  MOTHERS_DAY_2026_PROMO_START_YMD,
} from './mothersDay2026Promo';
import { getDiscountAllocationForCode, getDiscountForCode } from '@/lib/referral';
import { listPromoCodesForAdmin } from '@/lib/promo/listPromoCodesForAdmin';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const midWindow = new Date('2026-08-01T12:00:00+07:00');
const lastAdvanceDay = new Date('2026-08-10T12:00:00+07:00');
const mothersDaySpike = new Date('2026-08-12T12:00:00+07:00');
const beforeStart = new Date('2026-07-26T12:00:00+07:00');
const afterEnd = new Date('2026-08-11T12:00:00+07:00');
const onStart = new Date(`${MOTHERS_DAY_2026_PROMO_START_YMD}T12:00:00+07:00`);
const onEnd = new Date(`${MOTHERS_DAY_2026_PROMO_END_YMD}T23:00:00+07:00`);

const peakDelivery = '2026-08-12';
const otherDelivery = '2026-08-20';

// --- Active window (advance orders only: through 10 Aug) ---
assert(isMothersDay2026PromoActive(midWindow), 'active mid-window');
assert(isMothersDay2026PromoActive(onStart), 'active on start day');
assert(isMothersDay2026PromoActive(lastAdvanceDay), 'active on last advance day');
assert(isMothersDay2026PromoActive(onEnd), 'active on end day');
assert(!isMothersDay2026PromoActive(mothersDaySpike), 'inactive on spike order day');
assert(!isMothersDay2026PromoActive(beforeStart), 'inactive before start');
assert(!isMothersDay2026PromoActive(afterEnd), 'inactive from 11 Aug');

// --- Min items + delivery date ---
assert(
  mothersDay2026PromoDiscount(1499, midWindow, peakDelivery) === 0,
  'below min → 0'
);
assert(
  mothersDay2026PromoDiscount(1500, midWindow, peakDelivery) === 150,
  '1500 → 10% = 150'
);
assert(
  mothersDay2026PromoDiscount(1999, midWindow, peakDelivery) === 199,
  'floor percent'
);

assert(
  mothersDay2026PromoDiscount(2000, mothersDaySpike, peakDelivery) === 0,
  'spike order day → no MOM10'
);
assert(
  mothersDay2026PromoDiscount(2000, midWindow, otherDelivery) === 0,
  'non-peak delivery → no MOM10'
);
assert(
  mothersDay2026PromoDiscount(2000, midWindow, undefined) === 0,
  'missing delivery → no MOM10'
);

assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: '2026-08-11',
    now: midWindow,
  }) === 200,
  'Aug 11 delivery gets MOM10 when ordered in advance'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: '2026-08-12',
    now: midWindow,
  }) === 200,
  'Aug 12 delivery gets MOM10 when ordered in advance'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: '2026-08-13',
    now: midWindow,
  }) === 0,
  'Aug 13 delivery no longer eligible'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: peakDelivery,
    now: mothersDaySpike,
  }) === 0,
  'ordering on spike day blocks MOM10'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    now: midWindow,
  }) === 0,
  'delivery date required'
);

// --- Reasons ---
const below = evaluateMothersDay2026Promo(1000, {
  now: midWindow,
  deliveryDateYmd: peakDelivery,
});
assert(!below.ok && below.reason === 'below_minimum', 'below_minimum');

const expired = evaluateMothersDay2026Promo(2000, {
  now: afterEnd,
  deliveryDateYmd: peakDelivery,
});
assert(!expired.ok && expired.reason === 'expired', 'expired on/after 11 Aug');

const inactive = evaluateMothersDay2026Promo(2000, {
  now: beforeStart,
  deliveryDateYmd: peakDelivery,
});
assert(!inactive.ok && inactive.reason === 'inactive', 'inactive');

const wrongDelivery = evaluateMothersDay2026Promo(2000, {
  now: midWindow,
  deliveryDateYmd: otherDelivery,
});
assert(!wrongDelivery.ok && wrongDelivery.reason === 'wrong_delivery_date', 'wrong_delivery_date');

const missingDelivery = evaluateMothersDay2026Promo(2000, { now: midWindow });
assert(
  !missingDelivery.ok && missingDelivery.reason === 'missing_delivery_date',
  'missing_delivery_date'
);

assert(
  getDiscountAllocationForCode(MOTHERS_DAY_2026_PROMO_CODE) === 'items',
  'allocation is items'
);

// --- Admin catalog ---
const activeRows = listPromoCodesForAdmin(midWindow);
const momActive = activeRows.find((r) => r.code === MOTHERS_DAY_2026_PROMO_CODE);
assert(!!momActive, 'MOM10 in admin list');
assert(momActive!.status === 'active', 'admin status active mid-window');
assert(momActive!.summary.includes('1,500'), 'admin summary has min');
assert(momActive!.summary.includes('11–12 Aug'), 'admin summary mentions delivery window');

const scheduledRows = listPromoCodesForAdmin(beforeStart);
const momScheduled = scheduledRows.find((r) => r.code === MOTHERS_DAY_2026_PROMO_CODE);
assert(momScheduled!.status === 'scheduled', 'admin status scheduled before start');

const expiredRows = listPromoCodesForAdmin(afterEnd);
const momExpired = expiredRows.find((r) => r.code === MOTHERS_DAY_2026_PROMO_CODE);
assert(momExpired!.status === 'expired', 'admin status expired from 11 Aug');

console.log('mothersDay2026Promo.test.ts: all passed');
