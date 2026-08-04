/**
 * International Women's Day 2027 promo — WOMEN10.
 * 10% off items (≥ ฿1,500) for advance orders only:
 * order date before the 7–8 Mar spike, delivery on 7–8 Mar.
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

export const WOMENS_DAY_2027_PROMO_CODE = 'WOMEN10';

export const WOMENS_DAY_2027_PROMO_START_YMD = '2027-02-21';
export const WOMENS_DAY_2027_PROMO_END_YMD = '2027-03-06';
export const WOMENS_DAY_2027_DELIVERY_START_YMD = '2027-03-07';
export const WOMENS_DAY_2027_DELIVERY_END_YMD = '2027-03-08';

export const WOMENS_DAY_2027_PROMO_MIN_ITEMS_THB = 1500;
export const WOMENS_DAY_2027_PROMO_PERCENT = 10;

export type WomensDay2027IneligibleReason = AdvancePeakPromoIneligibleReason;
export type WomensDay2027Eligibility = AdvancePeakPromoEligibility;

export const WOMENS_DAY_2027_PROMO_CONFIG: AdvancePeakPromoConfig = {
  code: WOMENS_DAY_2027_PROMO_CODE,
  orderStartYmd: WOMENS_DAY_2027_PROMO_START_YMD,
  orderEndYmd: WOMENS_DAY_2027_PROMO_END_YMD,
  deliveryStartYmd: WOMENS_DAY_2027_DELIVERY_START_YMD,
  deliveryEndYmd: WOMENS_DAY_2027_DELIVERY_END_YMD,
  minItemsThb: WOMENS_DAY_2027_PROMO_MIN_ITEMS_THB,
  percent: WOMENS_DAY_2027_PROMO_PERCENT,
};

export function isWomensDay2027PromoCode(code: string | null | undefined): boolean {
  return isAdvancePeakPromoCode(code, WOMENS_DAY_2027_PROMO_CODE);
}

export function isWomensDay2027PromoActive(now: Date = new Date()): boolean {
  return isAdvancePeakPromoActive(WOMENS_DAY_2027_PROMO_CONFIG, now);
}

export function isWomensDay2027PromoDeliveryDate(deliveryDateYmd: string | null | undefined): boolean {
  return isAdvancePeakPromoDeliveryDate(WOMENS_DAY_2027_PROMO_CONFIG, deliveryDateYmd);
}

export function evaluateWomensDay2027Promo(
  itemsTotal: number,
  options: { now?: Date; deliveryDateYmd?: string | null } = {}
): WomensDay2027Eligibility {
  return evaluateAdvancePeakPromo(WOMENS_DAY_2027_PROMO_CONFIG, itemsTotal, options);
}

export function womensDay2027PromoDiscount(
  itemsTotal: number,
  now: Date = new Date(),
  deliveryDateYmd?: string | null
): number {
  return advancePeakPromoDiscount(WOMENS_DAY_2027_PROMO_CONFIG, itemsTotal, now, deliveryDateYmd);
}
