/**
 * New Year 2026 promo — NY10.
 * 10% off items (≥ ฿1,500) for advance orders only:
 * order date before the 30–31 Dec spike, delivery on 30–31 Dec.
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

export const NEW_YEAR_2026_PROMO_CODE = 'NY10';

export const NEW_YEAR_2026_PROMO_START_YMD = '2026-12-16';
export const NEW_YEAR_2026_PROMO_END_YMD = '2026-12-29';
export const NEW_YEAR_2026_DELIVERY_START_YMD = '2026-12-30';
export const NEW_YEAR_2026_DELIVERY_END_YMD = '2026-12-31';

export const NEW_YEAR_2026_PROMO_MIN_ITEMS_THB = 1500;
export const NEW_YEAR_2026_PROMO_PERCENT = 10;

export type NewYear2026IneligibleReason = AdvancePeakPromoIneligibleReason;
export type NewYear2026Eligibility = AdvancePeakPromoEligibility;

export const NEW_YEAR_2026_PROMO_CONFIG: AdvancePeakPromoConfig = {
  code: NEW_YEAR_2026_PROMO_CODE,
  orderStartYmd: NEW_YEAR_2026_PROMO_START_YMD,
  orderEndYmd: NEW_YEAR_2026_PROMO_END_YMD,
  deliveryStartYmd: NEW_YEAR_2026_DELIVERY_START_YMD,
  deliveryEndYmd: NEW_YEAR_2026_DELIVERY_END_YMD,
  minItemsThb: NEW_YEAR_2026_PROMO_MIN_ITEMS_THB,
  percent: NEW_YEAR_2026_PROMO_PERCENT,
};

export function isNewYear2026PromoCode(code: string | null | undefined): boolean {
  return isAdvancePeakPromoCode(code, NEW_YEAR_2026_PROMO_CODE);
}

export function isNewYear2026PromoActive(now: Date = new Date()): boolean {
  return isAdvancePeakPromoActive(NEW_YEAR_2026_PROMO_CONFIG, now);
}

export function isNewYear2026PromoDeliveryDate(deliveryDateYmd: string | null | undefined): boolean {
  return isAdvancePeakPromoDeliveryDate(NEW_YEAR_2026_PROMO_CONFIG, deliveryDateYmd);
}

export function evaluateNewYear2026Promo(
  itemsTotal: number,
  options: { now?: Date; deliveryDateYmd?: string | null } = {}
): NewYear2026Eligibility {
  return evaluateAdvancePeakPromo(NEW_YEAR_2026_PROMO_CONFIG, itemsTotal, options);
}

export function newYear2026PromoDiscount(
  itemsTotal: number,
  now: Date = new Date(),
  deliveryDateYmd?: string | null
): number {
  return advancePeakPromoDiscount(NEW_YEAR_2026_PROMO_CONFIG, itemsTotal, now, deliveryDateYmd);
}
