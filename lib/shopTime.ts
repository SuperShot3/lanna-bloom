/**
 * Lanna Bloom shop clock: Chiang Mai / Thailand.
 * Use for displaying order and ops timestamps so they match local expectations
 * regardless of the visitor's or server's timezone.
 */
export const SHOP_TIMEZONE = 'Asia/Bangkok';

/** Today's calendar date in the shop timezone (YYYY-MM-DD). */
export function shopTodayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Add calendar days in the shop timezone; input/output YYYY-MM-DD. */
export function shopAddDays(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00+07:00`);
  d.setDate(d.getDate() + deltaDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Format an ISO / DB timestamp for display in the shop timezone.
 */
export function formatShopDateTime(iso: string | null | undefined, emptyLabel = '—'): string {
  if (iso == null || iso === '') return emptyLabel;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-GB', {
      timeZone: SHOP_TIMEZONE,
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}
