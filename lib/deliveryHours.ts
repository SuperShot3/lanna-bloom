/**
 * Same-day delivery window in Chiang Mai (Asia/Bangkok).
 * Matches site copy: 09:00–20:00; orders after 20:00 go to the next day.
 */
import type { Locale } from '@/lib/i18n';

export const DELIVERY_SHOP_TIMEZONE = 'Asia/Bangkok';

const START_MIN = 9 * 60;
/** Half-open: includes 09:00, excludes 20:00 (closed from 20:00). */
const END_MIN = 20 * 60;

/** Same-day order cutoff in Bangkok (18:00). Orders after this usually deliver next day. */
export const SAME_DAY_ORDER_CUTOFF_MIN = 18 * 60;

function minutesSinceMidnightInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/** True when same-day delivery is currently accepted (Bangkok local time). */
export function isSameDayDeliveryOpenBangkok(date: Date): boolean {
  const t = minutesSinceMidnightInZone(date, DELIVERY_SHOP_TIMEZONE);
  return t >= START_MIN && t < END_MIN;
}

/** YYYY-MM-DD for the given instant in Bangkok. */
export function getBangkokYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Format a YYYY-MM-DD at noon Bangkok for locale display. */
function formatYmdForLocale(ymd: string, lang: Locale): string {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  if (lang === 'th') {
    return d.toLocaleDateString('th-TH', {
      timeZone: DELIVERY_SHOP_TIMEZONE,
      day: 'numeric',
      month: 'short',
    });
  }
  return d.toLocaleDateString('en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    day: 'numeric',
    month: 'short',
  });
}

/** Whether we are before opening, inside window, or after closing (Bangkok). */
export type SameDayDeliveryPhase = 'before' | 'open' | 'after';

export function getSameDayDeliveryPhaseBangkok(now: Date): SameDayDeliveryPhase {
  const t = minutesSinceMidnightInZone(now, DELIVERY_SHOP_TIMEZONE);
  if (t < START_MIN) return 'before';
  if (t < END_MIN) return 'open';
  return 'after';
}

/** Same-day order cutoff phase for cart banner (Bangkok). */
export type SameDayOrderCutoffPhase = 'before-cutoff' | 'after-cutoff' | 'before-open' | 'closed';

export function getSameDayOrderCutoffPhaseBangkok(now: Date): SameDayOrderCutoffPhase {
  const t = minutesSinceMidnightInZone(now, DELIVERY_SHOP_TIMEZONE);
  if (t < START_MIN) return 'before-open';
  if (t >= END_MIN) return 'closed';
  if (t < SAME_DAY_ORDER_CUTOFF_MIN) return 'before-cutoff';
  return 'after-cutoff';
}

/** Human-readable tomorrow date in Bangkok (for "next from 09:00" line). */
export function getTomorrowBangkokDisplayDate(now: Date, lang: Locale): string {
  const tomorrowYmd = addDaysToYmd(getBangkokYmd(now), 1);
  return formatYmdForLocale(tomorrowYmd, lang);
}

/** Live clock string HH:mm in Bangkok. */
export function formatBangkokTime(now: Date, lang: Locale): string {
  return now.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Short calendar date in Bangkok for live clocks (e.g. checkout header). */
export function formatBangkokDate(now: Date, lang: Locale): string {
  return now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
