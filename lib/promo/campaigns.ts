import { SHOP_TIMEZONE } from '@/lib/shopTime';

export const MAY_FREE_DELIVERY_CODE = 'MAY26-FREEDEL';
export const MAY_FREE_DELIVERY_MIN_ITEMS_THB = 2500;
const MAY_FREE_DELIVERY_START_YMD = '2026-05-19';
const MAY_FREE_DELIVERY_END_YMD = '2026-05-26';

function shopYmdForDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** True on 19–26 May 2026 inclusive (Asia/Bangkok calendar). */
export function isMay2026FreeDeliveryActive(now: Date = new Date()): boolean {
  const ymd = shopYmdForDate(now);
  return ymd >= MAY_FREE_DELIVERY_START_YMD && ymd <= MAY_FREE_DELIVERY_END_YMD;
}

export function qualifiesForMay2026FreeDelivery(itemsTotal: number): boolean {
  return itemsTotal >= MAY_FREE_DELIVERY_MIN_ITEMS_THB;
}

export function may2026FreeDeliveryDiscount(
  itemsTotal: number,
  deliveryFee: number,
  now: Date = new Date()
): number {
  if (!isMay2026FreeDeliveryActive(now)) return 0;
  if (!qualifiesForMay2026FreeDelivery(itemsTotal)) return 0;
  return Math.min(Math.max(0, deliveryFee), itemsTotal + deliveryFee);
}
