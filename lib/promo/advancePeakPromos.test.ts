/**
 * Advance-peak promo codes LOVE10 / WOMEN10 / NY10 (+ MOM10 regression via catalog).
 * Run with: npx tsx lib/promo/advancePeakPromos.test.ts
 */

import { getDiscountForCode, getDiscountAllocationForCode } from '@/lib/referral';
import { listPromoCodesForAdmin } from '@/lib/promo/listPromoCodesForAdmin';
import {
  evaluateValentines2027Promo,
  isValentines2027PromoActive,
  valentines2027PromoDiscount,
  VALENTINES_2027_PROMO_CODE,
} from './valentines2027Promo';
import {
  evaluateWomensDay2027Promo,
  isWomensDay2027PromoActive,
  womensDay2027PromoDiscount,
  WOMENS_DAY_2027_PROMO_CODE,
} from './womensDay2027Promo';
import {
  evaluateNewYear2026Promo,
  isNewYear2026PromoActive,
  newYear2026PromoDiscount,
  NEW_YEAR_2026_PROMO_CODE,
} from './newYear2026Promo';
import { getActiveAdvancePeakPromo } from './advancePeakPromoCatalog';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// --- LOVE10 ---
const loveMid = new Date('2027-02-01T12:00:00+07:00');
const loveLast = new Date('2027-02-11T12:00:00+07:00');
const loveSpike = new Date('2027-02-12T12:00:00+07:00');
const loveBefore = new Date('2027-01-28T12:00:00+07:00');
const loveDelivery = '2027-02-14';
const loveOtherDelivery = '2027-02-20';

assert(isValentines2027PromoActive(loveMid), 'LOVE10 active mid-window');
assert(isValentines2027PromoActive(loveLast), 'LOVE10 active last advance day');
assert(!isValentines2027PromoActive(loveSpike), 'LOVE10 inactive on spike');
assert(!isValentines2027PromoActive(loveBefore), 'LOVE10 inactive before start');
assert(valentines2027PromoDiscount(1500, loveMid, loveDelivery) === 150, 'LOVE10 10%');
assert(valentines2027PromoDiscount(1499, loveMid, loveDelivery) === 0, 'LOVE10 below min');
assert(valentines2027PromoDiscount(2000, loveSpike, loveDelivery) === 0, 'LOVE10 blocked on spike');
assert(valentines2027PromoDiscount(2000, loveMid, loveOtherDelivery) === 0, 'LOVE10 wrong delivery');
assert(
  getDiscountForCode(VALENTINES_2027_PROMO_CODE, 2100, {
    itemSubtotal: 2000,
    deliveryFee: 100,
    deliveryDateYmd: '2027-02-12',
    now: loveMid,
  }) === 200,
  'LOVE10 via referral for Feb 12 delivery'
);
assert(
  getDiscountAllocationForCode(VALENTINES_2027_PROMO_CODE) === 'items',
  'LOVE10 allocation items'
);

const loveWrong = evaluateValentines2027Promo(2000, {
  now: loveMid,
  deliveryDateYmd: loveOtherDelivery,
});
assert(!loveWrong.ok && loveWrong.reason === 'wrong_delivery_date', 'LOVE10 wrong_delivery_date');

// --- WOMEN10 ---
const womenMid = new Date('2027-03-01T12:00:00+07:00');
const womenSpike = new Date('2027-03-07T12:00:00+07:00');
assert(isWomensDay2027PromoActive(womenMid), 'WOMEN10 active');
assert(!isWomensDay2027PromoActive(womenSpike), 'WOMEN10 inactive on spike');
assert(
  womensDay2027PromoDiscount(1500, womenMid, '2027-03-08') === 150,
  'WOMEN10 10% for Mar 8 delivery'
);
assert(
  womensDay2027PromoDiscount(2000, womenMid, '2027-03-09') === 0,
  'WOMEN10 wrong delivery'
);
assert(
  getDiscountForCode(WOMENS_DAY_2027_PROMO_CODE, 1600, {
    itemSubtotal: 1500,
    deliveryFee: 100,
    deliveryDateYmd: '2027-03-07',
    now: womenMid,
  }) === 150,
  'WOMEN10 via referral'
);

const womenExpired = evaluateWomensDay2027Promo(2000, {
  now: womenSpike,
  deliveryDateYmd: '2027-03-07',
});
assert(!womenExpired.ok && womenExpired.reason === 'expired', 'WOMEN10 expired on spike');

// --- NY10 ---
const nyMid = new Date('2026-12-20T12:00:00+07:00');
const nySpike = new Date('2026-12-30T12:00:00+07:00');
assert(isNewYear2026PromoActive(nyMid), 'NY10 active');
assert(!isNewYear2026PromoActive(nySpike), 'NY10 inactive on spike');
assert(newYear2026PromoDiscount(1500, nyMid, '2026-12-31') === 150, 'NY10 10%');
assert(newYear2026PromoDiscount(2000, nyMid, '2027-01-01') === 0, 'NY10 Jan 1 not eligible');
assert(
  getDiscountForCode(NEW_YEAR_2026_PROMO_CODE, 1600, {
    itemSubtotal: 1500,
    deliveryFee: 100,
    deliveryDateYmd: '2026-12-30',
    now: nyMid,
  }) === 150,
  'NY10 via referral'
);

const nyMissing = evaluateNewYear2026Promo(2000, { now: nyMid });
assert(
  !nyMissing.ok && nyMissing.reason === 'missing_delivery_date',
  'NY10 missing_delivery_date'
);

// --- Catalog: active promo selection ---
assert(
  getActiveAdvancePeakPromo(new Date('2026-08-01T12:00:00+07:00'))?.config.code === 'MOM10',
  'active promo MOM10 in Aug'
);
assert(
  getActiveAdvancePeakPromo(nyMid)?.config.code === 'NY10',
  'active promo NY10 in Dec advance window'
);
assert(
  getActiveAdvancePeakPromo(loveMid)?.config.code === 'LOVE10',
  'active promo LOVE10 in Feb advance window'
);
assert(
  getActiveAdvancePeakPromo(womenMid)?.config.code === 'WOMEN10',
  'active promo WOMEN10 in Mar advance window'
);
assert(
  getActiveAdvancePeakPromo(loveSpike) == null,
  'no advance promo on Valentine spike day'
);

// --- Admin catalog ---
const loveAdmin = listPromoCodesForAdmin(loveMid).find((r) => r.code === 'LOVE10');
assert(!!loveAdmin && loveAdmin.status === 'active', 'LOVE10 admin active');
assert(loveAdmin!.summary.includes('12–14 Feb'), 'LOVE10 admin delivery label');

const womenAdmin = listPromoCodesForAdmin(loveBefore).find((r) => r.code === 'WOMEN10');
assert(!!womenAdmin && womenAdmin.status === 'scheduled', 'WOMEN10 admin scheduled');

const nyAdmin = listPromoCodesForAdmin(nySpike).find((r) => r.code === 'NY10');
assert(!!nyAdmin && nyAdmin.status === 'expired', 'NY10 admin expired on spike');

console.log('advancePeakPromos.test.ts: all passed');
