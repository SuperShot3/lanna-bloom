/**
 * LANNABLOOM coupon tier / eligibility tests.
 * Run with: npx tsx lib/promo/lannaBloomCoupon.test.ts
 */

import {
  evaluateLannaBloomCoupon,
  getLannaBloomTierAmount,
  isLannaBloomCouponActive,
  lannaBloomDiscountAmount,
  LANNA_BLOOM_COUPON_CODE,
  LANNA_BLOOM_COUPON_EXPIRES_YMD,
} from './lannaBloomCoupon';
import { getDiscountAllocationForCode, getDiscountForCode } from '@/lib/referral';
import { resolveOrderDiscount } from '@/lib/promo/resolveOrderDiscount';
import {
  MAY_FREE_DELIVERY_CODE,
  MAY_FREE_DELIVERY_MIN_ITEMS_THB,
} from '@/lib/promo/campaigns';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// --- Tier boundaries ---
assert(getLannaBloomTierAmount(2999) === 0, '2999 → 0');
assert(getLannaBloomTierAmount(3000) === 300, '3000 → 300');
assert(getLannaBloomTierAmount(3999) === 300, '3999 → 300');
assert(getLannaBloomTierAmount(4000) === 400, '4000 → 400');
assert(getLannaBloomTierAmount(4999) === 400, '4999 → 400');
assert(getLannaBloomTierAmount(5000) === 500, '5000 → 500');
assert(getLannaBloomTierAmount(12000) === 500, '12000 → 500');

// --- Catalog sale conflict ---
assert(
  lannaBloomDiscountAmount(5000, { hasCatalogProductDiscount: true }) === 0,
  'catalog discount blocks coupon'
);
assert(
  evaluateLannaBloomCoupon(5000, { hasCatalogProductDiscount: true }).ok === false &&
    !evaluateLannaBloomCoupon(5000, { hasCatalogProductDiscount: true }).ok &&
    (evaluateLannaBloomCoupon(5000, { hasCatalogProductDiscount: true }) as { reason: string })
      .reason === 'catalog_discount',
  'catalog_discount reason'
);

// --- Expiry ---
const afterExpiry = new Date(`${LANNA_BLOOM_COUPON_EXPIRES_YMD}T12:00:00+07:00`);
afterExpiry.setDate(afterExpiry.getDate() + 2);
assert(!isLannaBloomCouponActive(afterExpiry), 'expired after end date');
assert(
  lannaBloomDiscountAmount(5000, { now: afterExpiry }) === 0,
  'expired → 0 discount'
);

const onExpiryDay = new Date(`${LANNA_BLOOM_COUPON_EXPIRES_YMD}T23:00:00+07:00`);
assert(isLannaBloomCouponActive(onExpiryDay), 'still active on expiry day');

// --- getDiscountForCode uses items base (excludes delivery) ---
const withDelivery = getDiscountForCode(LANNA_BLOOM_COUPON_CODE, 3500 + 150, {
  itemSubtotal: 3500,
  deliveryFee: 150,
});
assert(withDelivery === 300, 'tier from items only; delivery not in base');
assert(
  getDiscountAllocationForCode(LANNA_BLOOM_COUPON_CODE) === 'items',
  'allocation is items'
);

// Below min on items even if grand total high
assert(
  getDiscountForCode(LANNA_BLOOM_COUPON_CODE, 2900 + 500, {
    itemSubtotal: 2900,
    deliveryFee: 500,
  }) === 0,
  'delivery cannot push over minimum'
);

// --- Resolver exclusive: manual beats May campaign ---
const mayWindow = new Date('2026-05-20T12:00:00+07:00');
const itemsForMay = MAY_FREE_DELIVERY_MIN_ITEMS_THB;
const deliveryFee = 200;
const withLanna = resolveOrderDiscount({
  itemsTotal: Math.max(itemsForMay, 3500),
  deliveryFee,
  referralCode: LANNA_BLOOM_COUPON_CODE,
  now: mayWindow,
});
assert(withLanna?.code === LANNA_BLOOM_COUPON_CODE, 'LANNABLOOM wins over May');
assert(withLanna?.discount === 300, 'LANNABLOOM tier 300 at 3500');
assert(withLanna?.source === 'manual', 'manual source');

const withLanna4000 = resolveOrderDiscount({
  itemsTotal: 4200,
  deliveryFee,
  referralCode: LANNA_BLOOM_COUPON_CODE,
  now: mayWindow,
});
assert(withLanna4000?.discount === 400, 'LANNABLOOM tier 400 at 4200');

const mayOnly = resolveOrderDiscount({
  itemsTotal: itemsForMay,
  deliveryFee,
  referralCode: null,
  now: mayWindow,
});
assert(mayOnly?.code === MAY_FREE_DELIVERY_CODE, 'May applies without manual code');
assert(mayOnly?.discount === deliveryFee, 'May waives delivery');

// Ineligible held LANNABLOOM blocks May (cannot combine)
const lannaBelowMin = resolveOrderDiscount({
  itemsTotal: Math.max(MAY_FREE_DELIVERY_MIN_ITEMS_THB, 2500),
  deliveryFee,
  referralCode: LANNA_BLOOM_COUPON_CODE,
  now: mayWindow,
  hasCatalogProductDiscount: true,
});
assert(lannaBelowMin == null, 'held ineligible LANNABLOOM blocks May campaign');

// --- Final payment math ---
const items = 5200;
const delivery = 180;
const discount = lannaBloomDiscountAmount(items);
assert(discount === 500, '500 tier');
const effective = items + delivery - discount;
assert(effective === 5200 + 180 - 500, 'effective grand total');

console.log('lannaBloomCoupon.test.ts: all assertions passed');
