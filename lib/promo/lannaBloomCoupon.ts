/**
 * Public LANNABLOOM coupon — tiered fixed discount off items subtotal.
 * Config is code-deployed (same pattern as May free-delivery campaign).
 */

import { SHOP_TIMEZONE } from '@/lib/shopTime';

export const LANNA_BLOOM_COUPON_CODE = 'LANNABLOOM';

/** Flip to false to disable without removing the code. */
export const LANNA_BLOOM_COUPON_ACTIVE = true;

/** Inclusive end date (Asia/Bangkok calendar). */
export const LANNA_BLOOM_COUPON_EXPIRES_YMD = '2026-12-31';

export const LANNA_BLOOM_COUPON_TIERS = [
  { minItemsTotal: 5000, amount: 500 },
  { minItemsTotal: 4000, amount: 400 },
  { minItemsTotal: 3000, amount: 300 },
] as const;

/** Lowest tier minimum (items subtotal before delivery). */
export const LANNA_BLOOM_COUPON_MIN_ITEMS_THB = 3000;

export type LannaBloomIneligibleReason =
  | 'inactive'
  | 'expired'
  | 'below_minimum'
  | 'catalog_discount';

export type LannaBloomEligibility =
  | { ok: true; amount: number; tier: number }
  | { ok: false; reason: LannaBloomIneligibleReason; amount: 0; tier: null };

function shopYmdForDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isLannaBloomCouponCode(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === LANNA_BLOOM_COUPON_CODE;
}

export function isLannaBloomCouponActive(now: Date = new Date()): boolean {
  if (!LANNA_BLOOM_COUPON_ACTIVE) return false;
  return shopYmdForDate(now) <= LANNA_BLOOM_COUPON_EXPIRES_YMD;
}

/** Highest matching tier amount for items subtotal, or 0. */
export function getLannaBloomTierAmount(itemsTotal: number): number {
  if (!Number.isFinite(itemsTotal) || itemsTotal < LANNA_BLOOM_COUPON_MIN_ITEMS_THB) return 0;
  for (const tier of LANNA_BLOOM_COUPON_TIERS) {
    if (itemsTotal >= tier.minItemsTotal) return tier.amount;
  }
  return 0;
}

export function evaluateLannaBloomCoupon(
  itemsTotal: number,
  options: { hasCatalogProductDiscount?: boolean; now?: Date } = {}
): LannaBloomEligibility {
  const now = options.now ?? new Date();
  if (!LANNA_BLOOM_COUPON_ACTIVE) {
    return { ok: false, reason: 'inactive', amount: 0, tier: null };
  }
  if (shopYmdForDate(now) > LANNA_BLOOM_COUPON_EXPIRES_YMD) {
    return { ok: false, reason: 'expired', amount: 0, tier: null };
  }
  if (options.hasCatalogProductDiscount) {
    return { ok: false, reason: 'catalog_discount', amount: 0, tier: null };
  }
  const amount = getLannaBloomTierAmount(itemsTotal);
  if (amount <= 0) {
    return { ok: false, reason: 'below_minimum', amount: 0, tier: null };
  }
  return { ok: true, amount, tier: amount };
}

export function lannaBloomDiscountAmount(
  itemsTotal: number,
  options: { hasCatalogProductDiscount?: boolean; now?: Date } = {}
): number {
  const result = evaluateLannaBloomCoupon(itemsTotal, options);
  return result.ok ? result.amount : 0;
}
