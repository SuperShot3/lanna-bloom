import { SHOP_TIMEZONE } from '@/lib/shopTime';

/** Minutes since midnight in `SHOP_TIMEZONE` for the given instant. */
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

/**
 * True during 08:00–10:00 and 14:00–16:00 in Asia/Bangkok (half-open: includes 08:00, excludes 10:00).
 */
export function isPrimeHourBangkok(date: Date): boolean {
  const t = minutesSinceMidnightInZone(date, SHOP_TIMEZONE);
  const morningStart = 8 * 60;
  const morningEnd = 10 * 60;
  const afternoonStart = 14 * 60;
  const afternoonEnd = 16 * 60;
  return (
    (t >= morningStart && t < morningEnd) ||
    (t >= afternoonStart && t < afternoonEnd)
  );
}
