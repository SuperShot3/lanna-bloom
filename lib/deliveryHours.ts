/**
 * Same-day delivery window in Chiang Mai (Asia/Bangkok).
 * Matches site copy: 08:00–20:00; orders after 20:00 go to the next day.
 */
export const DELIVERY_SHOP_TIMEZONE = 'Asia/Bangkok';

const START_MIN = 8 * 60;
/** Half-open: includes 08:00, excludes 20:00 (closed from 20:00). */
const END_MIN = 20 * 60;

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

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Format a YYYY-MM-DD at noon Bangkok for locale display. */
function formatYmdForLocale(ymd: string, lang: 'en' | 'th'): string {
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

/** Human-readable tomorrow date in Bangkok (for "next from 08:00" line). */
export function getTomorrowBangkokDisplayDate(now: Date, lang: 'en' | 'th'): string {
  const tomorrowYmd = addDaysToYmd(getBangkokYmd(now), 1);
  return formatYmdForLocale(tomorrowYmd, lang);
}

/** Live clock string HH:mm in Bangkok. */
export function formatBangkokTime(now: Date, lang: 'en' | 'th'): string {
  return now.toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-GB', {
    timeZone: DELIVERY_SHOP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
