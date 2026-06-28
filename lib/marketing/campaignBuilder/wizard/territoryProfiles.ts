import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { resolveTerritoryGeoTargetId } from '../territories';

export type MarketType = 'home' | 'beach_resort' | 'tourist' | 'expat';

export interface TerritoryProfile {
  destinationId: DeliveryDestinationId;
  territoryName: string;
  marketSlug: string | null;
  geoTargetId: number;
  marketType: MarketType;
  /** Path only, e.g. /en/phuket/flower-delivery */
  landingUrlPath: string;
  audienceNotes: string;
  occasionFocus: string[];
  /** Templates with `{city}` placeholder */
  keywordThemes: string[];
  /** Lowercase city names to block as cross-city negatives */
  negativeCrossCities: string[];
  deliveryBusinessRules: {
    sameDayAllowed: boolean;
  };
}

const ALL_CROSS_CITIES = [
  'chiang mai',
  'bangkok',
  'pattaya',
  'phuket',
  'krabi',
  'samui',
  'koh samui',
  'hua hin',
  'lamphun',
  'ao nang',
];

function crossCitiesExcept(territoryName: string): string[] {
  const lower = territoryName.toLowerCase();
  return ALL_CROSS_CITIES.filter((c) => !lower.includes(c) && c !== lower);
}

function profile(
  destinationId: DeliveryDestinationId,
  territoryName: string,
  marketSlug: string | null,
  marketType: MarketType,
  landingUrlPath: string,
  audienceNotes: string,
  sameDayAllowed: boolean,
): TerritoryProfile {
  const geoTargetId = resolveTerritoryGeoTargetId(territoryName);
  if (!geoTargetId) throw new Error(`No geo target for ${territoryName}`);

  const cityLower = territoryName.toLowerCase();

  return {
    destinationId,
    territoryName,
    marketSlug,
    geoTargetId,
    marketType,
    landingUrlPath,
    audienceNotes,
    occasionFocus: [
      'birthday',
      'anniversary',
      'romantic surprise',
      'apology',
      'sympathy',
      'gift while on holiday',
    ],
    keywordThemes: [
      `flower delivery ${cityLower}`,
      `send flowers ${cityLower}`,
      `birthday flowers ${cityLower}`,
      `florist ${cityLower}`,
      `flowers to hotel ${cityLower}`,
      `flowers to villa ${cityLower}`,
      `bouquet delivery ${cityLower}`,
      `online flower delivery ${cityLower}`,
    ],
    negativeCrossCities: crossCitiesExcept(territoryName),
    deliveryBusinessRules: { sameDayAllowed },
  };
}

export const TERRITORY_PROFILES: TerritoryProfile[] = [
  profile(
    'CHIANG_MAI',
    'Chiang Mai',
    null,
    'home',
    '/en/catalog',
    'Expats, tourists, hotel guests, English-speaking residents, and Thai users who search in English.',
    true,
  ),
  profile(
    'PHUKET',
    'Phuket',
    'phuket',
    'beach_resort',
    '/en/phuket/flower-delivery',
    'Tourists, expats, hotel and villa guests, English search behavior on holiday.',
    false,
  ),
  profile(
    'PATTAYA',
    'Pattaya',
    'pattaya',
    'tourist',
    '/en/pattaya/flower-delivery',
    'Tourists, expats, hotel guests, nightlife and holiday gift intent.',
    false,
  ),
  profile(
    'KRABI',
    'Krabi',
    'krabi',
    'beach_resort',
    '/en/krabi/flower-delivery',
    'Tourists, Ao Nang and island visitors, hotel and villa delivery.',
    false,
  ),
  profile(
    'SAMUI',
    'Koh Samui',
    'samui',
    'beach_resort',
    '/en/samui/flower-delivery',
    'Resort guests, villa stays, honeymoon and celebration gifts.',
    false,
  ),
  profile(
    'HUA_HIN',
    'Hua Hin',
    'hua-hin',
    'expat',
    '/en/hua-hin/flower-delivery',
    'Expat residents, weekend visitors, hotel and villa delivery.',
    false,
  ),
];

const BY_DESTINATION_ID: Record<string, TerritoryProfile> = Object.fromEntries(
  TERRITORY_PROFILES.map((p) => [p.destinationId, p]),
);

export function getTerritoryProfileByDestinationId(
  id: DeliveryDestinationId | string,
): TerritoryProfile | null {
  return BY_DESTINATION_ID[id] ?? null;
}

export function listWizardTerritories(): TerritoryProfile[] {
  return TERRITORY_PROFILES;
}

export function buildLandingUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://lannabloom.shop';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${normalized}`;
}
