import type { DeliveryDestinationId } from '@/lib/delivery/markets';

/** Default map pan when the customer has not dropped a pin yet. */
export const DESTINATION_MAP_CENTERS: Record<DeliveryDestinationId, { lat: number; lng: number }> = {
  CHIANG_MAI: { lat: 18.7883, lng: 98.9853 },
  BANGKOK: { lat: 13.7563, lng: 100.5018 },
  PATTAYA: { lat: 12.9236, lng: 100.8825 },
  PHUKET: { lat: 7.8804, lng: 98.3923 },
  KRABI: { lat: 8.0863, lng: 98.9063 },
  SAMUI: { lat: 9.512, lng: 100.0136 },
  HUA_HIN: { lat: 12.5706, lng: 99.958 },
  LAMPHUN: { lat: 18.5742, lng: 99.0087 },
  PAI: { lat: 19.3582, lng: 98.4405 },
};

export function mapCenterForDestination(
  destinationId?: string | null
): { lat: number; lng: number } {
  if (destinationId && destinationId in DESTINATION_MAP_CENTERS) {
    return DESTINATION_MAP_CENTERS[destinationId as DeliveryDestinationId];
  }
  return DESTINATION_MAP_CENTERS.CHIANG_MAI;
}

/** Open Google Maps centered on the destination when the customer has not set a pin yet. */
export function buildDestinationMapsUrl(
  destinationId?: string | null,
  zoom = 13
): string {
  const c = mapCenterForDestination(destinationId);
  return `https://www.google.com/maps/@${c.lat},${c.lng},${zoom}z`;
}
