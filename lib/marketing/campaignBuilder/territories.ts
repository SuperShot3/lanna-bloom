/** Google Ads geo target constant IDs for common Thai cities (English campaigns). */
export const TERRITORY_GEO_TARGETS: Record<string, number> = {
  'Chiang Mai': 1012728,
  Phuket: 1012724,
  Bangkok: 1012722,
  Pattaya: 1012723,
  'Hua Hin': 1012730,
  Krabi: 1012726,
  'Koh Samui': 1012725,
  Lamphun: 1012731,
};

export function resolveTerritoryGeoTargetId(territory: string): number | null {
  const normalized = territory.trim();
  const exact = TERRITORY_GEO_TARGETS[normalized];
  if (exact) return exact;

  const lower = normalized.toLowerCase();
  for (const [name, id] of Object.entries(TERRITORY_GEO_TARGETS)) {
    if (name.toLowerCase() === lower) return id;
  }
  return null;
}

export function listSupportedTerritories(): string[] {
  return Object.keys(TERRITORY_GEO_TARGETS);
}
