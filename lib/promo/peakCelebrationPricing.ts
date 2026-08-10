import { SHOP_TIMEZONE, shopAddDays, shopTodayYmd } from '@/lib/shopTime';

export const PEAK_CELEBRATION_MIN_ORDER_THB = 1500;
export const PEAK_CELEBRATION_VALENTINES_MIN_ORDER_THB = 2000;
export const PEAK_CELEBRATION_NOTICE_DAYS = 7;

export type PeakCelebrationId = 'valentines' | 'womens-day' | 'mothers-day' | 'new-year';

export type PeakCelebrationRule = {
  id: PeakCelebrationId;
  /** i18n key suffix under peakCelebrationNotice.events */
  nameKey: PeakCelebrationId;
  markupPercent: number;
  minOrderThb: number;
  /** Display label for policy / checkout (EN defaults). */
  startLabel: string;
  endLabel: string;
  /** Inclusive spike window (month/day, recurring annually). */
  window: PeakCelebrationWindow;
};

type PeakCelebrationWindow = {
  kind: 'range';
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export const PEAK_CELEBRATION_RULES: PeakCelebrationRule[] = [
  {
    id: 'valentines',
    nameKey: 'valentines',
    markupPercent: 30,
    minOrderThb: PEAK_CELEBRATION_VALENTINES_MIN_ORDER_THB,
    startLabel: '12 February',
    endLabel: '14 February',
    window: { kind: 'range', startMonth: 2, startDay: 12, endMonth: 2, endDay: 14 },
  },
  {
    id: 'womens-day',
    nameKey: 'womens-day',
    markupPercent: 15,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '7 March',
    endLabel: '8 March',
    window: { kind: 'range', startMonth: 3, startDay: 7, endMonth: 3, endDay: 8 },
  },
  {
    id: 'mothers-day',
    nameKey: 'mothers-day',
    markupPercent: 15,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '11 August',
    endLabel: '12 August',
    window: { kind: 'range', startMonth: 8, startDay: 11, endMonth: 8, endDay: 12 },
  },
  {
    id: 'new-year',
    nameKey: 'new-year',
    markupPercent: 20,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '30 December',
    endLabel: '31 December',
    window: { kind: 'range', startMonth: 12, startDay: 30, endMonth: 12, endDay: 31 },
  },
];

function shopYmdForDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseYmdParts(ymd: string): { year: number; month: number; day: number } | null {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function isDateInRangeWindow(
  month: number,
  day: number,
  window: PeakCelebrationWindow
): boolean {
  const startKey = window.startMonth * 100 + window.startDay;
  const endKey = window.endMonth * 100 + window.endDay;
  const currentKey = month * 100 + day;
  return currentKey >= startKey && currentKey <= endKey;
}

export function isDateInPeakWindow(ymd: string, window: PeakCelebrationWindow): boolean {
  const parts = parseYmdParts(ymd);
  if (!parts) return false;
  return isDateInRangeWindow(parts.month, parts.day, window);
}

/** Start YMD for the peak window that contains or follows the reference date. */
export function peakWindowStartYmdForYear(rule: PeakCelebrationRule, year: number): string {
  const m = String(rule.window.startMonth).padStart(2, '0');
  const d = String(rule.window.startDay).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseDeliveryDateFromPreferredTimeSlot(slot: string): string | null {
  const date = slot.trim().split(/\s+/)[0];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

/** Rule whose spike window contains the delivery date (min-order gate). */
export function getPeakCelebrationRuleForDeliveryDate(ymd: string): PeakCelebrationRule | null {
  if (!ymd) return null;
  for (const rule of PEAK_CELEBRATION_RULES) {
    if (isDateInPeakWindow(ymd, rule.window)) return rule;
  }
  return null;
}

export function getPeakCelebrationMinOrderRule(deliveryDateYmd: string): PeakCelebrationRule | null {
  return getPeakCelebrationRuleForDeliveryDate(deliveryDateYmd);
}

/**
 * Markup applies only when both order date and delivery date fall in the same
 * peak spike window (order during celebration for celebration delivery).
 */
export function shouldApplyPeakCelebrationMarkup(
  orderYmd: string,
  deliveryDateYmd: string
): boolean {
  if (!orderYmd || !deliveryDateYmd) return false;
  for (const rule of PEAK_CELEBRATION_RULES) {
    if (
      isDateInPeakWindow(orderYmd, rule.window) &&
      isDateInPeakWindow(deliveryDateYmd, rule.window)
    ) {
      return true;
    }
  }
  return false;
}

export function getPeakCelebrationRuleForCheckout(options: {
  orderYmd: string;
  deliveryDateYmd: string;
}): PeakCelebrationRule | null {
  const { orderYmd, deliveryDateYmd } = options;
  if (!orderYmd || !deliveryDateYmd) return null;
  for (const rule of PEAK_CELEBRATION_RULES) {
    if (
      isDateInPeakWindow(orderYmd, rule.window) &&
      isDateInPeakWindow(deliveryDateYmd, rule.window)
    ) {
      return rule;
    }
  }
  return null;
}

/**
 * Apply peak markup when order + delivery are both in the spike window.
 * `orderYmd` defaults to shop today (Bangkok) when omitted.
 */
export function applyPeakCelebrationMarkupThb(
  basePrice: number,
  deliveryDateYmd: string,
  orderYmd: string = shopTodayYmd()
): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return Math.max(0, Math.round(basePrice));
  const rule = getPeakCelebrationRuleForCheckout({ orderYmd, deliveryDateYmd });
  if (!rule) return Math.round(basePrice);
  return Math.round(basePrice * (1 + rule.markupPercent / 100));
}

/** Rule whose spike window contains the order (browse) day. */
export function getPeakCelebrationRuleForOrderDay(
  orderYmd: string = shopTodayYmd()
): PeakCelebrationRule | null {
  if (!orderYmd) return null;
  for (const rule of PEAK_CELEBRATION_RULES) {
    if (isDateInPeakWindow(orderYmd, rule.window)) return rule;
  }
  return null;
}

/**
 * Catalog/PDP/cart-line display markup.
 * - Delivery date known → same as checkout (order + delivery both in window).
 * - No delivery date → apply peak % when today is in a spike window (browse assumption).
 */
export function applyPeakCelebrationDisplayMarkupThb(
  basePrice: number,
  options: {
    deliveryDateYmd?: string | null;
    orderYmd?: string;
  } = {}
): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return Math.max(0, Math.round(basePrice));
  const orderYmd = options.orderYmd ?? shopTodayYmd();
  const deliveryDateYmd = options.deliveryDateYmd?.trim() ?? '';

  if (deliveryDateYmd) {
    return applyPeakCelebrationMarkupThb(basePrice, deliveryDateYmd, orderYmd);
  }

  const rule = getPeakCelebrationRuleForOrderDay(orderYmd);
  if (!rule) return Math.round(basePrice);
  return Math.round(basePrice * (1 + rule.markupPercent / 100));
}

/** Active spike-day rule for banners / PDP notices (not the advance-only window). */
export function getActivePeakCelebrationSpike(now: Date = new Date()): PeakCelebrationRule | null {
  return getPeakCelebrationRuleForOrderDay(shopYmdForDate(now));
}

export function isPeakCelebrationSpikeActive(now: Date = new Date()): boolean {
  return getActivePeakCelebrationSpike(now) != null;
}

/** Min order uses items + delivery whenever delivery falls in a peak window. */
export function qualifiesPeakCelebrationMinOrder(
  itemsTotal: number,
  deliveryFee: number,
  deliveryDateYmd: string
): boolean {
  const rule = getPeakCelebrationMinOrderRule(deliveryDateYmd);
  if (!rule) return true;
  const total = (Number.isFinite(itemsTotal) ? itemsTotal : 0) + (Number.isFinite(deliveryFee) ? deliveryFee : 0);
  return total >= rule.minOrderThb;
}

export function peakCelebrationMinOrderShortfall(
  itemsTotal: number,
  deliveryFee: number,
  deliveryDateYmd: string
): number {
  const rule = getPeakCelebrationMinOrderRule(deliveryDateYmd);
  if (!rule) return 0;
  const total = (Number.isFinite(itemsTotal) ? itemsTotal : 0) + (Number.isFinite(deliveryFee) ? deliveryFee : 0);
  return Math.max(0, rule.minOrderThb - total);
}

function referenceYearForNotice(rule: PeakCelebrationRule, todayYmd: string): number {
  const parts = parseYmdParts(todayYmd);
  if (!parts) return new Date().getFullYear();

  const startYmdThisYear = peakWindowStartYmdForYear(rule, parts.year);
  if (todayYmd > startYmdThisYear) {
    const endYmdThisYear = `${parts.year}-${String(rule.window.endMonth).padStart(2, '0')}-${String(rule.window.endDay).padStart(2, '0')}`;
    if (todayYmd > endYmdThisYear) {
      return parts.year + 1;
    }
  }
  return parts.year;
}

export function isPeakCelebrationNoticeActiveForDate(
  todayYmd: string,
  rule: PeakCelebrationRule
): boolean {
  const year = referenceYearForNotice(rule, todayYmd);
  const startYmd = peakWindowStartYmdForYear(rule, year);
  const noticeStart = shopAddDays(startYmd, -PEAK_CELEBRATION_NOTICE_DAYS);
  const noticeEnd = shopAddDays(startYmd, -1);
  return todayYmd >= noticeStart && todayYmd <= noticeEnd;
}

/** Rule whose 7-day advance notice window is active today (Bangkok). */
export function getActivePeakCelebrationNotice(now: Date = new Date()): PeakCelebrationRule | null {
  const todayYmd = shopYmdForDate(now);
  for (const rule of PEAK_CELEBRATION_RULES) {
    if (isPeakCelebrationNoticeActiveForDate(todayYmd, rule)) return rule;
  }
  return null;
}

export function isPeakCelebrationNoticeActive(now: Date = new Date()): boolean {
  return getActivePeakCelebrationNotice(now) != null;
}
