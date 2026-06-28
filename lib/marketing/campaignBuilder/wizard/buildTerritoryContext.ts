import 'server-only';

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import {
  buildLandingUrl,
  getTerritoryProfileByDestinationId,
  type TerritoryProfile,
} from './territoryProfiles';
import type { TerritoryContext } from './steps';

export function buildTerritoryContext(destinationId: DeliveryDestinationId | string): TerritoryContext | null {
  const profile = getTerritoryProfileByDestinationId(destinationId);
  if (!profile) return null;

  return {
    profile,
    landingUrl: buildLandingUrl(profile.landingUrlPath),
    hasLocalHistory: false,
  };
}

export function getTerritoryCityLower(profile: TerritoryProfile): string {
  return profile.territoryName.toLowerCase();
}

export function applyKeywordTheme(template: string, cityLower: string): string {
  return template.replace(/\{city\}/gi, cityLower);
}

export function buildRuleBasedKeywords(profile: TerritoryProfile): string[] {
  const city = getTerritoryCityLower(profile);
  return profile.keywordThemes.map((t) => applyKeywordTheme(t, city));
}

export function buildRuleBasedAdGroupNames(profile: TerritoryProfile): string[] {
  const city = profile.territoryName;
  if (profile.marketType === 'home') {
    return [`Flower Delivery ${city}`, `Birthday Flowers ${city}`];
  }
  return [
    `Flower Delivery ${city}`,
    `Birthday Flowers ${city}`,
    `Hotel & Villa Flower Delivery`,
  ].slice(0, 3);
}
