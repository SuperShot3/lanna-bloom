/**
 * Canonical delivery destinations and URL market slugs (province expansion MVP).
 */

import type { Locale } from '@/lib/i18n';

export const DELIVERY_DESTINATIONS = [
  'CHIANG_MAI',
  'BANGKOK',
  'PATTAYA',
  'PHUKET',
  'KRABI',
  'SAMUI',
  'HUA_HIN',
  'LAMPHUN',
] as const;

export type DeliveryDestinationId = (typeof DELIVERY_DESTINATIONS)[number];

export const EXPANSION_DESTINATION_IDS: DeliveryDestinationId[] = [
  'BANGKOK',
  'PATTAYA',
  'PHUKET',
  'KRABI',
  'SAMUI',
  'HUA_HIN',
  'LAMPHUN',
];

export const MARKET_PATH_SLUGS = [
  'bangkok',
  'pattaya',
  'phuket',
  'krabi',
  'samui',
  'hua-hin',
  'lamphun',
] as const;

export type MarketPathSlug = (typeof MARKET_PATH_SLUGS)[number];

/** SEO / ops lifecycle for expansion city routes. */
export type CityStatus = 'active' | 'coming_soon' | 'disabled';

export interface MarketRegistryEntry {
  pathSlug: MarketPathSlug;
  destinationId: DeliveryDestinationId;
  /** Customer-facing; never use province name as primary for Hua Hin */
  customerFacingNameEn: string;
  customerFacingNameTh: string;
  /**
   * active → indexable + sitemap + nav as delivery location
   * coming_soon → noindex,follow; excluded from sitemap; optional teaser in nav
   * disabled → route unavailable (notFound)
   */
  status: CityStatus;
  /** Optional SEO overrides for the city landing page */
  seoTitleEn?: string;
  seoTitleTh?: string;
  metaDescriptionEn?: string;
  metaDescriptionTh?: string;
}

export const MARKETS: MarketRegistryEntry[] = [
  {
    pathSlug: 'bangkok',
    destinationId: 'BANGKOK',
    customerFacingNameEn: 'Bangkok',
    customerFacingNameTh: 'กรุงเทพฯ',
    status: 'active',
  },
  {
    pathSlug: 'pattaya',
    destinationId: 'PATTAYA',
    customerFacingNameEn: 'Pattaya',
    customerFacingNameTh: 'พัทยา',
    status: 'active',
  },
  {
    pathSlug: 'phuket',
    destinationId: 'PHUKET',
    customerFacingNameEn: 'Phuket',
    customerFacingNameTh: 'ภูเก็ต',
    status: 'active',
  },
  {
    pathSlug: 'krabi',
    destinationId: 'KRABI',
    customerFacingNameEn: 'Krabi / Ao Nang',
    customerFacingNameTh: 'กระบี่ / อ่าวนาง',
    status: 'active',
  },
  {
    pathSlug: 'samui',
    destinationId: 'SAMUI',
    customerFacingNameEn: 'Koh Samui',
    customerFacingNameTh: 'เกาะสมุย',
    status: 'active',
  },
  {
    pathSlug: 'hua-hin',
    destinationId: 'HUA_HIN',
    customerFacingNameEn: 'Hua Hin',
    customerFacingNameTh: 'หัวหิน',
    status: 'active',
  },
  {
    pathSlug: 'lamphun',
    destinationId: 'LAMPHUN',
    customerFacingNameEn: 'Lamphun',
    customerFacingNameTh: 'ลำพูน',
    status: 'active',
  },
];

const SLUG_TO_ENTRY: Record<string, MarketRegistryEntry> = Object.fromEntries(
  MARKETS.map((m) => [m.pathSlug, m])
);

export function getMarketByPathSlug(slug: string): MarketRegistryEntry | null {
  return SLUG_TO_ENTRY[slug] ?? null;
}

/** Expansion market for a destination id, or null for Chiang Mai / unknown. */
export function getMarketByDestinationId(
  destinationId: string
): MarketRegistryEntry | null {
  const id = destinationId.trim().toUpperCase();
  if (!id || id === 'CHIANG_MAI') return null;
  return MARKETS.find((m) => m.destinationId === id) ?? null;
}

export function isMarketPathSlug(s: string): s is MarketPathSlug {
  return (MARKET_PATH_SLUGS as readonly string[]).includes(s);
}

export function isExpansionDestination(id: DeliveryDestinationId): boolean {
  return id !== 'CHIANG_MAI';
}

export function marketIsIndexable(market: MarketRegistryEntry): boolean {
  return market.status === 'active';
}

export function marketIsSitemapEnabled(market: MarketRegistryEntry): boolean {
  return market.status === 'active';
}

export function marketIsNavSelectable(market: MarketRegistryEntry): boolean {
  return market.status === 'active' || market.status === 'coming_soon';
}

export function marketIsRouteAvailable(market: MarketRegistryEntry): boolean {
  return market.status !== 'disabled';
}

/** Expansion markets safe to list as active delivery destinations. */
export function getActiveMarkets(): MarketRegistryEntry[] {
  return MARKETS.filter((m) => m.status === 'active');
}

/** Markets that may appear in destination pickers (active + coming soon). */
export function getNavMarkets(): MarketRegistryEntry[] {
  return MARKETS.filter(marketIsNavSelectable);
}

export function destinationDisplayName(
  id: DeliveryDestinationId,
  lang: Locale
): string {
  if (id === 'CHIANG_MAI') {
    return lang === 'th' ? 'เชียงใหม่' : 'Chiang Mai';
  }
  const m = MARKETS.find((x) => x.destinationId === id);
  if (!m) return id;
  return lang === 'th' ? m.customerFacingNameTh : m.customerFacingNameEn;
}

export function parseDeliveryDestinationId(
  raw: string | null | undefined
): DeliveryDestinationId | undefined {
  const v = raw?.trim().toUpperCase();
  if (!v) return undefined;
  return (DELIVERY_DESTINATIONS as readonly string[]).includes(v)
    ? (v as DeliveryDestinationId)
    : undefined;
}

/** Customer-facing shop subtitle on order pages and similar surfaces. */
export function flowerDeliverySubtitleLabel(
  destinationId: DeliveryDestinationId | null | undefined,
  lang: Locale
): string {
  const city = destinationDisplayName(destinationId ?? 'CHIANG_MAI', lang);
  return lang === 'th' ? `ส่งดอกไม้ · ${city}` : `Flower Delivery · ${city}`;
}
