/**
 * Shared parsing for Accounting route search params (server components).
 */

export interface ResolvedAccountingPeriod {
  userAskedAllTime: boolean;
  noExplicitPeriod: boolean;
  effectivePeriod: { dateFrom?: string; dateTo?: string };
}

/** Returns YYYY-MM-DD pair for the first/last day of the current calendar month (local time). */
export function currentAccountingMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: fmt(first), dateTo: fmt(last) };
}

export function resolveAccountingPeriod(params: {
  dateFrom?: string;
  dateTo?: string;
  period?: string;
}): ResolvedAccountingPeriod {
  const userAskedAllTime = params.period === 'all';
  const noExplicitPeriod = !params.dateFrom && !params.dateTo;
  const effectivePeriod =
    noExplicitPeriod && !userAskedAllTime ? currentAccountingMonthRange() : { dateFrom: params.dateFrom, dateTo: params.dateTo };
  return { userAskedAllTime, noExplicitPeriod, effectivePeriod };
}

export function buildAccountingPeriodLabel(
  effectivePeriod: { dateFrom?: string; dateTo?: string },
  opts: { userAskedAllTime: boolean; noExplicitPeriod: boolean }
): string {
  if (opts.userAskedAllTime) return 'All time';

  const { dateFrom, dateTo } = effectivePeriod;
  if (dateFrom && dateTo) {
    const fStart = new Date(dateFrom + 'T12:00:00');
    const fEnd = new Date(dateTo + 'T12:00:00');
    const sameMonth =
      fStart.getFullYear() === fEnd.getFullYear() &&
      fStart.getMonth() === fEnd.getMonth() &&
      fStart.getDate() === 1 &&
      fEnd.getDate() === new Date(fEnd.getFullYear(), fEnd.getMonth() + 1, 0).getDate();
    if (sameMonth) {
      return `${fStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}${opts.noExplicitPeriod ? ' (this month)' : ''}`;
    }
    return `${dateFrom} → ${dateTo}`;
  }
  if (dateFrom) return `From ${dateFrom}`;
  if (dateTo) return `Until ${dateTo}`;
  return 'All time';
}
