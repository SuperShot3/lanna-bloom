/**
 * Date helpers for Vercel (UTC) with calendar semantics in Asia/Bangkok.
 */

function bangkokYmd(t = new Date()): { y: number; m: number; d: number } {
  const s = t.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  return { y, m, d };
}

function utcAtCalendarDate(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d);
}

/**
 * Returns the calendar year in which the next occurrence of (month, day) falls
 * and the number of full days from today's Bangkok date to that date (0 = same day).
 */
export function nextOccasionFromMonthDay(occasionMonth: number, occasionDay: number): {
  occasionYear: number;
  daysLeft: number;
} {
  const { y } = bangkokYmd();
  const thisYear = y;
  let targetY = thisYear;
  let t0 = utcAtCalendarDate(thisYear, occasionMonth, occasionDay);
  const { y: _ty, m: tm, d: td } = bangkokYmd();
  const todayMs = utcAtCalendarDate(_ty, tm, td);
  if (t0 < todayMs) {
    targetY = thisYear + 1;
    t0 = utcAtCalendarDate(targetY, occasionMonth, occasionDay);
  }
  const daysLeft = Math.round((t0 - todayMs) / 86400000);
  return { occasionYear: targetY, daysLeft };
}

/**
 * If `occasionYear` is set, the reminder is only for that year (single year).
 * Otherwise, yearly recurrence.
 */
export function getOccasionTarget(
  occasionMonth: number,
  occasionDay: number,
  fixedYear: number | null
): { occasionYear: number; daysLeft: number } {
  if (fixedYear) {
    const { y, m, d: td } = bangkokYmd(new Date());
    const todayMs = utcAtCalendarDate(y, m, td);
    const eventMs = utcAtCalendarDate(fixedYear, occasionMonth, occasionDay);
    const daysLeft = Math.round((eventMs - todayMs) / 86400000);
    return { occasionYear: fixedYear, daysLeft };
  }
  return nextOccasionFromMonthDay(occasionMonth, occasionDay);
}
