/**
 * Lanna Bloom shop clock: Chiang Mai / Thailand.
 * Use for displaying order and ops timestamps so they match local expectations
 * regardless of the visitor's or server's timezone.
 */
export const SHOP_TIMEZONE = 'Asia/Bangkok';

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
