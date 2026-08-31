/**
 * True when `cost` is a real partner wholesale amount — safe to snapshot onto
 * the order and prefill admin COGS. Own catalog products store sell price in
 * `cost` with commission 0; that must not become COGS.
 */
export function isPartnerWholesaleCost(input: {
  itemType?: string | null;
  cost?: number | null;
  commissionPercent?: number | null;
  commissionAmount?: number | null;
}): boolean {
  const cost = input.cost;
  if (cost == null || !(cost > 0)) return false;
  if (input.itemType != null && input.itemType !== 'product') return false;
  if ((input.commissionPercent ?? 0) > 0) return true;
  if ((input.commissionAmount ?? 0) > 0) return true;
  return false;
}

/**
 * Compute profit: total - cogs - delivery_cost - payment_fee.
 * Treats null as 0. Never returns NaN.
 */
export function computeProfit(
  total: number | null | undefined,
  cogs: number | null | undefined,
  deliveryCost: number | null | undefined,
  paymentFee: number | null | undefined
): number | null {
  const t = total ?? 0;
  const c = cogs ?? 0;
  const d = deliveryCost ?? 0;
  const p = paymentFee ?? 0;
  const profit = t - c - d - p;
  if (Number.isNaN(profit)) return null;
  return Math.round(profit * 100) / 100;
}

/** Format THB amount for display. */
export function formatThb(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `฿${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
