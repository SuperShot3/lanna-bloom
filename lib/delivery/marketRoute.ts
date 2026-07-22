import {
  isMarketPathSlug,
  type MarketPathSlug,
} from '@/lib/delivery/markets';

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
 * Build market-aware product detail href when browsing within a market funnel.
 * Falls back to the main Chiang Mai catalog path.
 */
export function buildCatalogItemHref(params: {
  lang: string;
  slug: string;
  pathname?: string | null;
}): string {
  const { lang, slug, pathname } = params;
  const base = `/${lang}/catalog/${slug}`;
  if (!pathname) return base;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return base;
  if (parts[0] !== lang) return base;
  // Pattern A: /{lang}/{market}/...
  const maybeMarketDirect = parts[1];
  if (isMarketPathSlug(maybeMarketDirect)) {
    return `/${lang}/catalog/${maybeMarketDirect}/${slug}`;
  }
  // Pattern B1: /{lang}/catalog/{market}
  const maybeCatalog = parts[1];
  const maybeMarketUnderCatalog = parts[2];
  if (maybeCatalog === 'catalog' && isMarketPathSlug(maybeMarketUnderCatalog)) {
    return `/${lang}/catalog/${maybeMarketUnderCatalog}/${slug}`;
  }
  // Pattern B2 (legacy): /{lang}/catalog/{market}/catalog...
  const maybeLegacyCatalogTail = parts[3];
  if (
    maybeCatalog === 'catalog' &&
    isMarketPathSlug(maybeMarketUnderCatalog) &&
    maybeLegacyCatalogTail === 'catalog'
  ) {
    return `/${lang}/catalog/${maybeMarketUnderCatalog}/${slug}`;
  }
  return base;
}

