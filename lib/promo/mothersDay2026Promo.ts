/**
 * Thai Mother's Day 2026 early-order promo — MOM10.
 * 10% off items (≥ ฿1,500) when ordering in the campaign window
 * with delivery strictly before peak (before 10 Aug 2026).
 */

import { SHOP_TIMEZONE } from '@/lib/shopTime';

export const MOTHERS_DAY_2026_PROMO_CODE = 'MOM10';

/** Inclusive start (Asia/Bangkok calendar). */
export const MOTHERS_DAY_2026_PROMO_START_YMD = '2026-07-27';

/** Inclusive end — last day to place an early-order (non-peak) delivery. */
export const MOTHERS_DAY_2026_PROMO_END_YMD = '2026-08-09';

/** Delivery date must be strictly before this YMD (peak starts 10 Aug). */
export const MOTHERS_DAY_2026_PROMO_MAX_DELIVERY_YMD_EXCLUSIVE = '2026-08-10';

export const MOTHERS_DAY_2026_PROMO_MIN_ITEMS_THB = 1500;
export const MOTHERS_DAY_2026_PROMO_PERCENT = 10;

export type MothersDay2026IneligibleReason =
  | 'inactive'
  | 'expired'
  | 'below_minimum'
  | 'peak_delivery'
  | 'needs_delivery_date';

export type MothersDay2026Eligibility =
  | { ok: true; amount: number }
  | { ok: false; reason: MothersDay2026IneligibleReason; amount: 0 };

function shopYmdForDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isMothersDay2026PromoCode(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === MOTHERS_DAY_2026_PROMO_CODE;
}

/** True on 27 Jul – 9 Aug 2026 inclusive (Asia/Bangkok). */
export function isMothersDay2026PromoActive(now: Date = new Date()): boolean {
  const ymd = shopYmdForDate(now);
  return (
    ymd >= MOTHERS_DAY_2026_PROMO_START_YMD && ymd <= MOTHERS_DAY_2026_PROMO_END_YMD
  );
}

export function evaluateMothersDay2026Promo(
  itemsTotal: number,
  options: { deliveryDateYmd?: string | null; now?: Date } = {}
): MothersDay2026Eligibility {
  const now = options.now ?? new Date();
  const ymd = shopYmdForDate(now);

  if (ymd < MOTHERS_DAY_2026_PROMO_START_YMD) {
    return { ok: false, reason: 'inactive', amount: 0 };
  }
  if (ymd > MOTHERS_DAY_2026_PROMO_END_YMD) {
    return { ok: false, reason: 'expired', amount: 0 };
  }

  const deliveryDateYmd = options.deliveryDateYmd?.trim() ?? '';
  if (!deliveryDateYmd) {
    return { ok: false, reason: 'needs_delivery_date', amount: 0 };
  }
  if (deliveryDateYmd >= MOTHERS_DAY_2026_PROMO_MAX_DELIVERY_YMD_EXCLUSIVE) {
    return { ok: false, reason: 'peak_delivery', amount: 0 };
  }

  if (!Number.isFinite(itemsTotal) || itemsTotal < MOTHERS_DAY_2026_PROMO_MIN_ITEMS_THB) {
    return { ok: false, reason: 'below_minimum', amount: 0 };
  }

  const amount = Math.floor((itemsTotal * MOTHERS_DAY_2026_PROMO_PERCENT) / 100);
  if (amount <= 0) {
    return { ok: false, reason: 'below_minimum', amount: 0 };
  }
  return { ok: true, amount };
}

export function mothersDay2026PromoDiscount(
  itemsTotal: number,
  deliveryDateYmd: string | null | undefined,
  now: Date = new Date()
): number {
  const result = evaluateMothersDay2026Promo(itemsTotal, { deliveryDateYmd, now });
  return result.ok ? result.amount : 0;
}
