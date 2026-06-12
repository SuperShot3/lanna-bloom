/**
 * YYYY-MM-DD in the user's local timezone — matches native `<input type="date">` values.
 * (Avoid `toISOString().slice(0, 10)`, which is UTC and mismatches local dates near midnight.)
 */
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getLocalTodayYmd(): string {
  return toLocalYmd(new Date());
}

export function getLocalTomorrowYmd(): string {
  const now = new Date();
  return toLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}
