/**
 * Catalog entry + category gating from province config (Feature 4).
 * Client- and server-safe pure helpers.
 */

import type { ProvinceStatus } from './types';

export type ShopAccessProvince = {
  status: ProvinceStatus;
  catalog_enabled: boolean;
  available_categories?: string[] | null;
};

const BLOCKED_CATALOG_STATUSES = new Set<ProvinceStatus>([
  'coming_soon',
  'temporarily_unavailable',
]);

/** Normalize admin/customer category keys (e.g. toys → plushy_toys). */
export function normalizeShopCategoryKey(key: string): string {
  const k = key.trim().toLowerCase();
  if (k === 'toys') return 'plushy_toys';
  return k;
}

/**
 * Whether the customer may enter the product catalog for this province.
 * Missing province row → true (do not invent a block when config is absent).
 */
export function canEnterCatalog(
  province: ShopAccessProvince | null | undefined
): boolean {
  if (!province) return true;
  if (!province.catalog_enabled) return false;
  if (BLOCKED_CATALOG_STATUSES.has(province.status)) return false;
  return true;
}

/**
 * Whether a catalog top-category (or product category) is shoppable.
 * - If `available_categories` is set and non-empty: only listed keys.
 * - If null/empty: expansion destinations stay flowers-only; Chiang Mai allows all.
 */
export function categoryAllowed(
  province: ShopAccessProvince | null | undefined,
  categoryKey: string,
  opts: { isExpansionDestination: boolean }
): boolean {
  const key = normalizeShopCategoryKey(categoryKey);
  if (!key) return false;

  const raw = province?.available_categories;
  if (Array.isArray(raw) && raw.length > 0) {
    const allowed = new Set(raw.map(normalizeShopCategoryKey).filter(Boolean));
    return allowed.has(key);
  }

  if (opts.isExpansionDestination) {
    return key === 'flowers';
  }
  return true;
}
