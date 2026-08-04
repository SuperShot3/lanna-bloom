/**
 * Thai Mother's Day 2026 promo — MOM10.
 * 10% off items (≥ ฿1,500) for advance orders only:
 * order date before the 11–12 Aug spike, delivery on 11–12 Aug.
 * Peak markup (order + delivery both on 11–12) is separate and blocks this promo.
 */

import {
  advancePeakPromoDiscount,
  evaluateAdvancePeakPromo,
  isAdvancePeakPromoActive,
  isAdvancePeakPromoCode,
  isAdvancePeakPromoDeliveryDate,
  type AdvancePeakPromoConfig,
  type AdvancePeakPromoEligibility,
  type AdvancePeakPromoIneligibleReason,
} from '@/lib/promo/advancePeakPromo';

export const MOTHERS_DAY_2026_PROMO_CODE = 'MOM10';

/** Inclusive start for placing an advance order (Asia/Bangkok calendar). */
export const MOTHERS_DAY_2026_PROMO_START_YMD = '2026-07-27';

/**
 * Last inclusive order day for MOM10 (day before spike).
 * Orders on/after 11 Aug are not advance and cannot use MOM10.
 */
export const MOTHERS_DAY_2026_PROMO_END_YMD = '2026-08-10';

/** Delivery must fall in the Mother’s Day spike window. */
export const MOTHERS_DAY_2026_DELIVERY_START_YMD = '2026-08-11';
export const MOTHERS_DAY_2026_DELIVERY_END_YMD = '2026-08-12';

export const MOTHERS_DAY_2026_PROMO_MIN_ITEMS_THB = 1500;
export const MOTHERS_DAY_2026_PROMO_PERCENT = 10;

export type MothersDay2026IneligibleReason = AdvancePeakPromoIneligibleReason;
export type MothersDay2026Eligibility = AdvancePeakPromoEligibility;

export const MOTHERS_DAY_2026_PROMO_CONFIG: AdvancePeakPromoConfig = {
  code: MOTHERS_DAY_2026_PROMO_CODE,
  orderStartYmd: MOTHERS_DAY_2026_PROMO_START_YMD,
  orderEndYmd: MOTHERS_DAY_2026_PROMO_END_YMD,
  deliveryStartYmd: MOTHERS_DAY_2026_DELIVERY_START_YMD,
  deliveryEndYmd: MOTHERS_DAY_2026_DELIVERY_END_YMD,
  minItemsThb: MOTHERS_DAY_2026_PROMO_MIN_ITEMS_THB,
  percent: MOTHERS_DAY_2026_PROMO_PERCENT,
};

export function isMothersDay2026PromoCode(code: string | null | undefined): boolean {
  return isAdvancePeakPromoCode(code, MOTHERS_DAY_2026_PROMO_CODE);
}

/** True on 27 Jul – 10 Aug 2026 inclusive (Asia/Bangkok) — advance-order window. */
export function isMothersDay2026PromoActive(now: Date = new Date()): boolean {
  return isAdvancePeakPromoActive(MOTHERS_DAY_2026_PROMO_CONFIG, now);
}

export function isMothersDay2026PromoDeliveryDate(deliveryDateYmd: string | null | undefined): boolean {
  return isAdvancePeakPromoDeliveryDate(MOTHERS_DAY_2026_PROMO_CONFIG, deliveryDateYmd);
}

export function evaluateMothersDay2026Promo(
  itemsTotal: number,
  options: { now?: Date; deliveryDateYmd?: string | null } = {}
): MothersDay2026Eligibility {
  return evaluateAdvancePeakPromo(MOTHERS_DAY_2026_PROMO_CONFIG, itemsTotal, options);
}

export function mothersDay2026PromoDiscount(
  itemsTotal: number,
  now: Date = new Date(),
  deliveryDateYmd?: string | null
): number {
  return advancePeakPromoDiscount(MOTHERS_DAY_2026_PROMO_CONFIG, itemsTotal, now, deliveryDateYmd);
}
