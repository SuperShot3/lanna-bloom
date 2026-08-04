/**
 * Shared evaluator for advance-order peak celebration promo codes (MOM10, LOVE10, …).
 * 10% off items for orders placed before the spike, for delivery inside the spike.
 */

import { SHOP_TIMEZONE } from '@/lib/shopTime';

export type AdvancePeakPromoIneligibleReason =
  | 'inactive'
  | 'expired'
  | 'below_minimum'
  | 'wrong_delivery_date'
  | 'missing_delivery_date';

export type AdvancePeakPromoEligibility =
  | { ok: true; amount: number }
  | { ok: false; reason: AdvancePeakPromoIneligibleReason; amount: 0 };

export type AdvancePeakPromoConfig = {
  code: string;
  /** Inclusive order window (Asia/Bangkok). */
  orderStartYmd: string;
  orderEndYmd: string;
  /** Inclusive delivery window. */
  deliveryStartYmd: string;
  deliveryEndYmd: string;
  minItemsThb: number;
  percent: number;
};

export function shopYmdForDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isAdvancePeakPromoCode(
  code: string | null | undefined,
  configCode: string
): boolean {
  return code?.trim().toUpperCase() === configCode;
}

export function isAdvancePeakPromoActive(config: AdvancePeakPromoConfig, now: Date = new Date()): boolean {
  const ymd = shopYmdForDate(now);
  return ymd >= config.orderStartYmd && ymd <= config.orderEndYmd;
}

export function isAdvancePeakPromoDeliveryDate(
  config: AdvancePeakPromoConfig,
  deliveryDateYmd: string | null | undefined
): boolean {
  const ymd = deliveryDateYmd?.trim() ?? '';
  if (!ymd) return false;
  return ymd >= config.deliveryStartYmd && ymd <= config.deliveryEndYmd;
}

export function evaluateAdvancePeakPromo(
  config: AdvancePeakPromoConfig,
  itemsTotal: number,
  options: { now?: Date; deliveryDateYmd?: string | null } = {}
): AdvancePeakPromoEligibility {
  const now = options.now ?? new Date();
  const ymd = shopYmdForDate(now);

  if (ymd < config.orderStartYmd) {
    return { ok: false, reason: 'inactive', amount: 0 };
  }
  if (ymd > config.orderEndYmd) {
    return { ok: false, reason: 'expired', amount: 0 };
  }

  const deliveryDateYmd = options.deliveryDateYmd?.trim() ?? '';
  if (!deliveryDateYmd) {
    return { ok: false, reason: 'missing_delivery_date', amount: 0 };
  }
  if (!isAdvancePeakPromoDeliveryDate(config, deliveryDateYmd)) {
    return { ok: false, reason: 'wrong_delivery_date', amount: 0 };
  }

  if (!Number.isFinite(itemsTotal) || itemsTotal < config.minItemsThb) {
    return { ok: false, reason: 'below_minimum', amount: 0 };
  }

  const amount = Math.floor((itemsTotal * config.percent) / 100);
  if (amount <= 0) {
    return { ok: false, reason: 'below_minimum', amount: 0 };
  }
  return { ok: true, amount };
}

export function advancePeakPromoDiscount(
  config: AdvancePeakPromoConfig,
  itemsTotal: number,
  now: Date = new Date(),
  deliveryDateYmd?: string | null
): number {
  const result = evaluateAdvancePeakPromo(config, itemsTotal, { now, deliveryDateYmd });
  return result.ok ? result.amount : 0;
}
