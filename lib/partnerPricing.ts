/**
 * Partner product pricing: final price = partner cost + platform commission.
 * For own items (commissionPercent null/0), final price = price (no markup).
 */
export function computeFinalPrice(
  cost: number,
  commissionPercent?: number | null
): number {
  if (commissionPercent == null || commissionPercent <= 0) {
    return cost;
  }
  const pct = Math.max(0, Math.min(500, commissionPercent));
  return Math.round(cost * (1 + pct / 100) * 100) / 100;
}
