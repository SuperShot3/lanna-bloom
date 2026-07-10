import { SHOP_TIMEZONE, shopAddDays } from '@/lib/shopTime';

export const PEAK_CELEBRATION_MIN_ORDER_THB = 2000;
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
  /** Inclusive delivery window (month/day, recurring annually). */
  window: PeakCelebrationWindow;
};

type PeakCelebrationWindow =
  | { kind: 'range'; startMonth: number; startDay: number; endMonth: number; endDay: number }
  | { kind: 'new-year' };

export const PEAK_CELEBRATION_RULES: PeakCelebrationRule[] = [
  {
    id: 'valentines',
    nameKey: 'valentines',
    markupPercent: 30,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '10 February',
    endLabel: '15 February',
    window: { kind: 'range', startMonth: 2, startDay: 10, endMonth: 2, endDay: 15 },
  },
  {
    id: 'womens-day',
    nameKey: 'womens-day',
    markupPercent: 15,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '6 March',
    endLabel: '9 March',
    window: { kind: 'range', startMonth: 3, startDay: 6, endMonth: 3, endDay: 9 },
  },
  {
    id: 'mothers-day',
    nameKey: 'mothers-day',
    markupPercent: 15,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '10 August',
    endLabel: '13 August',
    window: { kind: 'range', startMonth: 8, startDay: 10, endMonth: 8, endDay: 13 },
  },
  {
    id: 'new-year',
    nameKey: 'new-year',
    markupPercent: 20,
    minOrderThb: PEAK_CELEBRATION_MIN_ORDER_THB,
    startLabel: '29 December',
    endLabel: '2 January',
    window: { kind: 'new-year' },
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
  window: Extract<PeakCelebrationWindow, { kind: 'range' }>
): boolean {
  const startKey = window.startMonth * 100 + window.startDay;
  const endKey = window.endMonth * 100 + window.endDay;
  const currentKey = month * 100 + day;
  return currentKey >= startKey && currentKey <= endKey;
}

function isDateInNewYearWindow(month: number, day: number): boolean {
  return (month === 12 && day >= 29) || (month === 1 && day <= 2);
}

export function isDateInPeakWindow(ymd: string, window: PeakCelebrationWindow): boolean {
  const parts = parseYmdParts(ymd);
  if (!parts) return false;
  if (window.kind === 'new-year') return isDateInNewYearWindow(parts.month, parts.day);
  return isDateInRangeWindow(parts.month, parts.day, window);
}

/** Start YMD for the peak window that contains or follows the reference date. */
export function peakWindowStartYmdForYear(rule: PeakCelebrationRule, year: number): string {
  if (rule.window.kind === 'new-year') {
    return `${year}-12-29`;
  }
  const m = String(rule.window.startMonth).padStart(2, '0');
  const d = String(rule.window.startDay).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseDeliveryDateFromPreferredTimeSlot(slot: string): string | null {
  const date = slot.trim().split(/\s+/)[0];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export function getPeakCelebrationRuleForDeliveryDate(ymd: string): PeakCelebrationRule | null {
  if (!ymd) return null;
  for (const rule of PEAK_CELEBRATION_RULES) {
    if (isDateInPeakWindow(ymd, rule.window)) return rule;
  }
  return null;
}

export function applyPeakCelebrationMarkupThb(basePrice: number, deliveryDateYmd: string): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return Math.max(0, Math.round(basePrice));
  const rule = getPeakCelebrationRuleForDeliveryDate(deliveryDateYmd);
  if (!rule) return Math.round(basePrice);
  return Math.round(basePrice * (1 + rule.markupPercent / 100));
}

export function qualifiesPeakCelebrationMinOrder(itemsTotal: number, deliveryDateYmd: string): boolean {
  const rule = getPeakCelebrationRuleForDeliveryDate(deliveryDateYmd);
  if (!rule) return true;
  return itemsTotal >= rule.minOrderThb;
}

export function peakCelebrationMinOrderShortfall(
  itemsTotal: number,
  deliveryDateYmd: string
): number {
  const rule = getPeakCelebrationRuleForDeliveryDate(deliveryDateYmd);
  if (!rule) return 0;
  return Math.max(0, rule.minOrderThb - itemsTotal);
}

function referenceYearForNotice(rule: PeakCelebrationRule, todayYmd: string): number {
  const parts = parseYmdParts(todayYmd);
  if (!parts) return new Date().getFullYear();

  if (rule.window.kind === 'new-year') {
    // After Jan 2, the next notice targets Dec 29 of the same calendar year.
    if (parts.month === 1 && parts.day <= 2) return parts.year - 1;
    return parts.year;
  }

  const startYmdThisYear = peakWindowStartYmdForYear(rule, parts.year);
  if (todayYmd > startYmdThisYear) {
    // Past this year's window — next notice is next year (except rules that don't wrap).
    const endParts = parseYmdParts(
      rule.window.kind === 'range'
        ? `${parts.year}-${String(rule.window.endMonth).padStart(2, '0')}-${String(rule.window.endDay).padStart(2, '0')}`
        : `${parts.year + 1}-01-02`
    );
    if (endParts && todayYmd > `${parts.year}-${String(endParts.month).padStart(2, '0')}-${String(endParts.day).padStart(2, '0')}`) {
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
