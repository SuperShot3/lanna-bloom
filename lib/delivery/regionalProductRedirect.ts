/**
 * Detect legacy regional product URLs so middleware can 308 to the
 * canonical /[lang]/catalog/[slug] product path and set the region cookie.
 */

import {
  getMarketByPathSlug,
  isMarketPathSlug,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';

const STOREFRONT_LANGS = new Set(['en', 'th', 'ru', 'zh-sg', 'zh-hk']);

export type RegionalProductRedirectMatch = {
  lang: string;
  destinationId: DeliveryDestinationId;
  productSlug: string;
  targetPath: string;
};

/**
 * Match:
 * - /[lang]/catalog/[market]/[slug]  (not …/catalog listing tail)
 * - /[lang]/[market]/catalog/[slug]  (legacy market-group product hop)
 *
 * Does not match landings /[lang]/[market]/flower-delivery or catalog listings.
 */
export function matchRegionalProductRedirect(
  pathname: string
): RegionalProductRedirectMatch | null {
  const trimmed = (pathname.split('?')[0]?.split('#')[0] ?? pathname).replace(/\/$/, '') || '/';
  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length !== 4) return null;

  const [lang, a, b, c] = parts;
  if (!lang || !STOREFRONT_LANGS.has(lang) || !c) return null;

  // /:lang/catalog/:market/:slug
  if (a === 'catalog' && isMarketPathSlug(b) && c !== 'catalog') {
    const market = getMarketByPathSlug(b);
    if (!market) return null;
    return {
      lang,
      destinationId: market.destinationId,
      productSlug: c,
      targetPath: `/${lang}/catalog/${c}`,
    };
  }

  // /:lang/:market/catalog/:slug
  if (isMarketPathSlug(a) && b === 'catalog') {
    const market = getMarketByPathSlug(a);
    if (!market) return null;
    return {
      lang,
      destinationId: market.destinationId,
      productSlug: c,
      targetPath: `/${lang}/catalog/${c}`,
    };
  }

  return null;
}

export type MarketCatalogListingMatch = {
  lang: string;
  marketSlug: string;
  destinationId: DeliveryDestinationId;
  targetPath: string;
};

function storefrontPathParts(pathname: string): string[] {
  const trimmed = (pathname.split('?')[0]?.split('#')[0] ?? pathname).replace(/\/$/, '') || '/';
  return trimmed.split('/').filter(Boolean);
}

function listingMatch(
  lang: string,
  marketSlug: string
): MarketCatalogListingMatch | null {
  if (!isMarketPathSlug(marketSlug)) return null;
  const market = getMarketByPathSlug(marketSlug);
  if (!market) return null;
  return {
    lang,
    marketSlug,
    destinationId: market.destinationId,
    targetPath: `/${lang}/catalog`,
  };
}

/**
 * 308 /[lang]/catalog/[market]/catalog onto the single catalog listing.
 * Query string is preserved by the caller (clone nextUrl, set pathname).
 */
export function matchUglyMarketCatalogRedirect(
  pathname: string
): MarketCatalogListingMatch | null {
  const parts = storefrontPathParts(pathname);
  if (parts.length !== 4) return null;
  const [lang, a, b, c] = parts;
  if (!lang || !STOREFRONT_LANGS.has(lang) || a !== 'catalog' || c !== 'catalog') {
    return null;
  }
  if (!b) return null;
  return listingMatch(lang, b);
}

/**
 * 308 /[lang]/catalog/[market] onto the single catalog listing and set the
 * delivery-region cookie. Does not match product PDPs (third segment is not a
 * market slug).
 */
export function matchPrettyMarketCatalogRedirect(
  pathname: string
): MarketCatalogListingMatch | null {
  const parts = storefrontPathParts(pathname);
  if (parts.length !== 3) return null;
  const [lang, a, b] = parts;
  if (!lang || !STOREFRONT_LANGS.has(lang) || a !== 'catalog' || !b) return null;
  return listingMatch(lang, b);
}

/** @deprecated Use matchPrettyMarketCatalogRedirect — listings 308 onto /catalog. */
export const matchPrettyMarketCatalogRewrite = matchPrettyMarketCatalogRedirect;

/** Strip leftover city listing tails so client navigations stay on /catalog. */
export function publicStorefrontPathname(pathname: string): string {
  const listing =
    matchUglyMarketCatalogRedirect(pathname) ?? matchPrettyMarketCatalogRedirect(pathname);
  return listing?.targetPath ?? pathname;
}

/** True when this path is a product PDP (clean or still-regional) for the locale. */
export function isStorefrontCatalogProductPath(pathname: string, lang: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== lang || parts[1] !== 'catalog') return false;
  const third = parts[2];
  if (!third) return false;
  if (isMarketPathSlug(third) && (!parts[3] || parts[3] === 'catalog')) return false;
  return true;
}

/**
 * Paths that must keep the selected delivery region (cookie + session).
 * Home is excluded so it can still clear sessionStorage; the persistent cookie
 * is not cleared there. The main catalog listing keeps the region.
 */
export function shouldPreserveDeliveryRegionOnPath(pathname: string, lang: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== lang) return false;
  const second = parts[1];

  if (second === 'cart' || second === 'checkout' || second === 'track-order') return true;
  if (second === 'catalog') return true;
  if (second && isMarketPathSlug(second)) return true;
  return false;
}

export function isStorefrontCheckoutPath(pathname: string, lang: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === lang && (parts[1] === 'cart' || parts[1] === 'checkout');
}
