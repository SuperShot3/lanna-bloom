/**
 * Canonical delivery destinations and URL market slugs (province expansion MVP).
 */

import type { Locale } from '@/lib/i18n';

export const DELIVERY_DESTINATIONS = [
  'CHIANG_MAI',
  'PATTAYA',
  'PHUKET',
  'KRABI',
  'SAMUI',
  'HUA_HIN',
] as const;

export type DeliveryDestinationId = (typeof DELIVERY_DESTINATIONS)[number];

export const EXPANSION_DESTINATION_IDS: DeliveryDestinationId[] = [
  'PATTAYA',
  'PHUKET',
  'KRABI',
  'SAMUI',
  'HUA_HIN',
];

export const MARKET_PATH_SLUGS = [
  'pattaya',
  'phuket',
  'krabi',
  'samui',
  'hua-hin',
] as const;

export type MarketPathSlug = (typeof MARKET_PATH_SLUGS)[number];

export interface MarketRegistryEntry {
  pathSlug: MarketPathSlug;
  destinationId: DeliveryDestinationId;
  /** Customer-facing; never use province name as primary for Hua Hin */
  customerFacingNameEn: string;
  customerFacingNameTh: string;
}

export const MARKETS: MarketRegistryEntry[] = [
  {
    pathSlug: 'pattaya',
    destinationId: 'PATTAYA',
    customerFacingNameEn: 'Pattaya',
    customerFacingNameTh: 'พัทยา',
  },
  {
    pathSlug: 'phuket',
    destinationId: 'PHUKET',
    customerFacingNameEn: 'Phuket',
    customerFacingNameTh: 'ภูเก็ต',
  },
  {
    pathSlug: 'krabi',
    destinationId: 'KRABI',
    customerFacingNameEn: 'Krabi / Ao Nang',
    customerFacingNameTh: 'กระบี่ / อ่าวนาง',
  },
  {
    pathSlug: 'samui',
    destinationId: 'SAMUI',
    customerFacingNameEn: 'Koh Samui',
    customerFacingNameTh: 'เกาะสมุย',
  },
  {
    pathSlug: 'hua-hin',
    destinationId: 'HUA_HIN',
    customerFacingNameEn: 'Hua Hin',
    customerFacingNameTh: 'หัวหิน',
  },
];

const SLUG_TO_ENTRY: Record<string, MarketRegistryEntry> = Object.fromEntries(
  MARKETS.map((m) => [m.pathSlug, m])
);

export function getMarketByPathSlug(slug: string): MarketRegistryEntry | null {
  return SLUG_TO_ENTRY[slug] ?? null;
}

export function isMarketPathSlug(s: string): s is MarketPathSlug {
  return (MARKET_PATH_SLUGS as readonly string[]).includes(s);
}

export function isExpansionDestination(id: DeliveryDestinationId): boolean {
  return id !== 'CHIANG_MAI';
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
