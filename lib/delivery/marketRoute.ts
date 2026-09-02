import {
  getMarketByDestinationId,
  isMarketPathSlug,
  type MarketPathSlug,
} from '@/lib/delivery/markets';
import { PROVINCE_SEED_ROSTER } from '@/lib/provinces/seedRoster';

/**
 * Catalog entry for a province code via seed destination → market slug.
 * Does not put destination_id on PublicProvince (Feature 4 / tests omit it).
 */
export function catalogHrefForProvinceCode(
  lang: string,
  provinceCode: string
): string {
  const seed = PROVINCE_SEED_ROSTER.find((r) => r.province_code === provinceCode);
  const dest = seed?.destination_id;
  if (!dest || dest === 'CHIANG_MAI') return `/${lang}/catalog`;
  const market = getMarketByDestinationId(dest);
  return buildMarketCatalogHref(lang, market?.pathSlug);
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
 * Market catalog listing: expansion → /{lang}/catalog/{market}; otherwise CM catalog.
 */
export function buildMarketCatalogHref(
  lang: string,
  marketSlug: MarketPathSlug | string | null | undefined,
  search?: string
): string {
  const path =
    marketSlug && isMarketPathSlug(marketSlug)
      ? `/${lang}/catalog/${marketSlug}`
      : `/${lang}/catalog`;
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

