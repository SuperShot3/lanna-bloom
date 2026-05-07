import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { DELIVERY_DESTINATIONS } from '@/lib/delivery/markets';

export interface BouquetDestinationExclusionFields {
  excludedDeliveryDestinations?: DeliveryDestinationId[] | string[] | null;
}

function normalizeExcluded(
  excluded: BouquetDestinationExclusionFields['excludedDeliveryDestinations']
): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(excluded)) return set;
  for (const id of excluded) {
    if (typeof id === 'string' && id.trim()) set.add(id.trim());
  }
  return set;
}

export function bouquetIsAvailableForDestination(
  bouquet: BouquetDestinationExclusionFields,
  destinationId: DeliveryDestinationId
): boolean {
  const excluded = normalizeExcluded(bouquet.excludedDeliveryDestinations);
  return !excluded.has(destinationId);
}

/** Strip invalid Sanity values; keeps only known destination ids. */
export function parseExcludedDeliveryDestinations(
  raw: unknown
): DeliveryDestinationId[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set<string>(DELIVERY_DESTINATIONS);
  const out = raw.filter((v): v is DeliveryDestinationId => typeof v === 'string' && allowed.has(v));
  return out.length ? out : undefined;
}
