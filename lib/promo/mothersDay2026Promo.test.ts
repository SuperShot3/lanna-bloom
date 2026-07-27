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
const mothersDay = new Date('2026-08-12T12:00:00+07:00');
const dayAfter = new Date('2026-08-13T12:00:00+07:00');
const beforeStart = new Date('2026-07-26T12:00:00+07:00');
const afterEnd = new Date('2026-08-14T12:00:00+07:00');
const onStart = new Date(`${MOTHERS_DAY_2026_PROMO_START_YMD}T12:00:00+07:00`);
const onEnd = new Date(`${MOTHERS_DAY_2026_PROMO_END_YMD}T23:00:00+07:00`);

// --- Active window (through Mother's Day + 1) ---
assert(isMothersDay2026PromoActive(midWindow), 'active mid-window');
assert(isMothersDay2026PromoActive(onStart), 'active on start day');
assert(isMothersDay2026PromoActive(mothersDay), 'active on Mother’s Day 12 Aug');
assert(isMothersDay2026PromoActive(dayAfter), 'active day after Mother’s Day');
assert(isMothersDay2026PromoActive(onEnd), 'active on end day');
assert(!isMothersDay2026PromoActive(beforeStart), 'inactive before start');
assert(!isMothersDay2026PromoActive(afterEnd), 'inactive after end');

// --- Min items ---
assert(mothersDay2026PromoDiscount(1499, midWindow) === 0, 'below min → 0');
assert(mothersDay2026PromoDiscount(1500, midWindow) === 150, '1500 → 10% = 150');
assert(mothersDay2026PromoDiscount(1999, midWindow) === 199, 'floor percent');

// --- Peak delivery dates are allowed (no delivery-date gate) ---
assert(
  mothersDay2026PromoDiscount(2000, mothersDay) === 200,
  'Mother’s Day order day ok'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: '2026-08-12',
    now: midWindow,
  }) === 200,
  'Aug 12 delivery still gets MOM10'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: '2026-08-13',
    now: midWindow,
  }) === 200,
  'Aug 13 delivery still gets MOM10'
);
assert(
  getDiscountForCode(MOTHERS_DAY_2026_PROMO_CODE, 2000 + 100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    now: midWindow,
  }) === 200,
  'no delivery date required'
);

// --- Reasons ---
const below = evaluateMothersDay2026Promo(1000, { now: midWindow });
assert(!below.ok && below.reason === 'below_minimum', 'below_minimum');

const expired = evaluateMothersDay2026Promo(2000, { now: afterEnd });
assert(!expired.ok && expired.reason === 'expired', 'expired');

const inactive = evaluateMothersDay2026Promo(2000, { now: beforeStart });
assert(!inactive.ok && inactive.reason === 'inactive', 'inactive');

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
assert(momActive!.summary.includes('12 Aug'), 'admin summary mentions Mother’s Day');

const scheduledRows = listPromoCodesForAdmin(beforeStart);
const momScheduled = scheduledRows.find((r) => r.code === MOTHERS_DAY_2026_PROMO_CODE);
assert(momScheduled!.status === 'scheduled', 'admin status scheduled before start');

const expiredRows = listPromoCodesForAdmin(afterEnd);
const momExpired = expiredRows.find((r) => r.code === MOTHERS_DAY_2026_PROMO_CODE);
assert(momExpired!.status === 'expired', 'admin status expired after end');

console.log('mothersDay2026Promo.test.ts: all passed');
