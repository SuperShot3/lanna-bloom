/** Minimum paid units before a sold count is shown on the storefront. */
export const MIN_PUBLIC_SOLD_COUNT = 5;

/**
 * Fold order_items.bouquet_id keys that still use a legacy Sanity id
 * into the current catalog UUID so old paid orders count toward the live product.
 */
export function foldLegacySalesCounts(
  countsByStoredId: Record<string, number>,
  catalogIdByLegacyId: Record<string, string>
): Record<string, number> {
  const folded: Record<string, number> = {};
  for (const [storedId, count] of Object.entries(countsByStoredId)) {
    if (!storedId || !Number.isFinite(count) || count <= 0) continue;
    const catalogId = catalogIdByLegacyId[storedId] ?? storedId;
    folded[catalogId] = (folded[catalogId] ?? 0) + count;
  }
  return folded;
}

/** Storefront display count — hide sparse numbers so new products do not look abandoned. */
export function publicSoldCount(raw: number | undefined | null): number | null {
  if (raw == null || !Number.isFinite(raw) || raw < MIN_PUBLIC_SOLD_COUNT) return null;
  return Math.floor(raw);
}

export function attachPublicSoldCount<T extends { id: string }>(
  item: T,
  countsByCatalogId: Record<string, number>
): T & { soldCount?: number } {
  const shown = publicSoldCount(countsByCatalogId[item.id]);
  if (shown == null) return { ...item };
  return { ...item, soldCount: shown };
}
