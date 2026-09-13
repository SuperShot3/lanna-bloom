import { isMarketPathSlug, type MarketPathSlug } from '@/lib/delivery/markets';

/**
 * Catalog listing URL for a province. One catalog for all regions; the
 * delivery-region cookie (not the path) selects price and availability.
 */
export function catalogHrefForProvinceCode(
  lang: string,
  _provinceCode: string
): string {
  return `/${lang}/catalog`;
}

/**
 * Market home: expansion → /{lang}/{market}/flower-delivery; otherwise Chiang Mai hub.
 */
export function buildMarketHomeHref(
  lang: string,
  marketSlug: MarketPathSlug | string | null | undefined
): string {
  if (marketSlug && isMarketPathSlug(marketSlug)) {
    return `/${lang}/${marketSlug}/flower-delivery`;
  }
  return `/${lang}`;
}

/**
 * Catalog listing: one URL per language. Delivery region lives in cookie/session.
 */
export function buildMarketCatalogHref(
  lang: string,
  _marketSlug?: MarketPathSlug | string | null | undefined,
  search?: string
): string {
  const path = `/${lang}/catalog`;
  if (!search) return path;
  const q = search.startsWith('?') ? search : `?${search}`;
  return `${path}${q}`;
}

/**
 * Canonical product href — one URL per language. Delivery region lives in
 * cookie/session, never in the product path.
 */
export function buildCatalogItemHref(params: {
  lang: string;
  slug: string;
  pathname?: string | null;
}): string {
  return `/${params.lang}/catalog/${params.slug}`;
}

