/**
 * Valentine's Day 2027 promo — LOVE10.
 * 10% off items (≥ ฿1,500) for advance orders only:
 * order date before the 12–14 Feb spike, delivery on 12–14 Feb.
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

export const VALENTINES_2027_PROMO_CODE = 'LOVE10';

export const VALENTINES_2027_PROMO_START_YMD = '2027-01-29';
export const VALENTINES_2027_PROMO_END_YMD = '2027-02-11';
export const VALENTINES_2027_DELIVERY_START_YMD = '2027-02-12';
export const VALENTINES_2027_DELIVERY_END_YMD = '2027-02-14';

export const VALENTINES_2027_PROMO_MIN_ITEMS_THB = 1500;
export const VALENTINES_2027_PROMO_PERCENT = 10;

export type Valentines2027IneligibleReason = AdvancePeakPromoIneligibleReason;
export type Valentines2027Eligibility = AdvancePeakPromoEligibility;

export const VALENTINES_2027_PROMO_CONFIG: AdvancePeakPromoConfig = {
  code: VALENTINES_2027_PROMO_CODE,
  orderStartYmd: VALENTINES_2027_PROMO_START_YMD,
  orderEndYmd: VALENTINES_2027_PROMO_END_YMD,
  deliveryStartYmd: VALENTINES_2027_DELIVERY_START_YMD,
  deliveryEndYmd: VALENTINES_2027_DELIVERY_END_YMD,
  minItemsThb: VALENTINES_2027_PROMO_MIN_ITEMS_THB,
  percent: VALENTINES_2027_PROMO_PERCENT,
};

export function isValentines2027PromoCode(code: string | null | undefined): boolean {
  return isAdvancePeakPromoCode(code, VALENTINES_2027_PROMO_CODE);
}

export function isValentines2027PromoActive(now: Date = new Date()): boolean {
  return isAdvancePeakPromoActive(VALENTINES_2027_PROMO_CONFIG, now);
}

export function isValentines2027PromoDeliveryDate(deliveryDateYmd: string | null | undefined): boolean {
  return isAdvancePeakPromoDeliveryDate(VALENTINES_2027_PROMO_CONFIG, deliveryDateYmd);
}

export function evaluateValentines2027Promo(
  itemsTotal: number,
  options: { now?: Date; deliveryDateYmd?: string | null } = {}
): Valentines2027Eligibility {
  return evaluateAdvancePeakPromo(VALENTINES_2027_PROMO_CONFIG, itemsTotal, options);
}

export function valentines2027PromoDiscount(
  itemsTotal: number,
  now: Date = new Date(),
  deliveryDateYmd?: string | null
): number {
  return advancePeakPromoDiscount(VALENTINES_2027_PROMO_CONFIG, itemsTotal, now, deliveryDateYmd);
}
