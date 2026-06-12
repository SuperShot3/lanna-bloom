/**
 * Server-side delivery zone suggestion from Places / coordinates.
 * Fee always comes from destination + resolved zone — never trust client fee.
 */

import { detectDistrictFromAddress } from '@/lib/deliveryFees';
import type { OrderDeliveryDestinationId } from '@/lib/orders';
import {
  chiangMaiZoneIdFromLegacyDistrict,
  findZoneDef,
  getZonesForDestination,
  isSupportedZone,
} from '@/lib/delivery/zones';

const CHIANG_MAI_BOUNDS = {
  south: 18.55,
  north: 19.05,
  west: 98.75,
  east: 99.15,
};

/** Nimman / Old City–ish central box (soft heuristic only). */
const CM_CENTRAL_BOUNDS = {
  south: 18.76,
  north: 18.82,
  west: 98.95,
  east: 99.02,
};

function inBounds(
  lat: number,
  lng: number,
  b: { south: number; north: number; west: number; east: number }
): boolean {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

function zoneFromPostcodeAllowlist(
  destinationId: OrderDeliveryDestinationId,
  postalCode: string
): string | null {
  for (const z of getZonesForDestination(destinationId)) {
    if (z.postalCodes?.includes(postalCode)) return z.id;
    if (
      z.postalPrefixes?.some((p) => {
        const prefix = p.replace(/\D/g, '');
        return prefix.length > 0 && postalCode.startsWith(prefix);
      })
    ) {
      return z.id;
    }
  }
  return null;
}

export type ResolveDeliveryZoneInput = {
  deliveryDestination: OrderDeliveryDestinationId;
  /** Customer-selected zone (hint only for non–Chiang Mai or when inference fails). */
  clientZoneId: string;
  address?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
  postalCode?: string | null;
  province?: string | null;
};

/**
 * Authoritative zone id for pricing. Falls back to supported client zone, then destination default unknown.
 */
export function resolveDeliveryZoneFromPlace(input: ResolveDeliveryZoneInput): string {
  const { deliveryDestination, clientZoneId } = input;
  const text = [input.formattedAddress, input.address].filter(Boolean).join(' ').trim();

  if (input.postalCode?.trim()) {
    const fromPostal = zoneFromPostcodeAllowlist(
      deliveryDestination,
      input.postalCode.trim()
    );
    if (fromPostal && isSupportedZone(deliveryDestination, fromPostal)) {
      return fromPostal;
    }
  }

  if (deliveryDestination === 'CHIANG_MAI') {
    const detected = text ? detectDistrictFromAddress(text) : null;
    if (detected) {
      const isCentral =
        detected === 'MUEANG' &&
        typeof input.lat === 'number' &&
        typeof input.lng === 'number' &&
        inBounds(input.lat, input.lng, CM_CENTRAL_BOUNDS);
      const zoneId = chiangMaiZoneIdFromLegacyDistrict(detected, isCentral);
      if (zoneId && isSupportedZone('CHIANG_MAI', zoneId)) return zoneId;
    }

    if (typeof input.lat === 'number' && typeof input.lng === 'number') {
      if (!inBounds(input.lat, input.lng, CHIANG_MAI_BOUNDS)) {
        if (isSupportedZone('CHIANG_MAI', 'cm-unknown')) return 'cm-unknown';
      } else if (inBounds(input.lat, input.lng, CM_CENTRAL_BOUNDS)) {
        return 'cm-mueang-central';
      } else if (isSupportedZone('CHIANG_MAI', 'cm-mueang-non-central')) {
        return 'cm-mueang-non-central';
      }
    }
  }

  if (
    clientZoneId &&
    isSupportedZone(deliveryDestination, clientZoneId) &&
    findZoneDef(deliveryDestination, clientZoneId)
  ) {
    return clientZoneId;
  }

  const zones = getZonesForDestination(deliveryDestination);
  const unknown = zones.find((z) => z.id.includes('unknown')) ?? zones[zones.length - 1];
  return unknown?.id ?? clientZoneId;
}
