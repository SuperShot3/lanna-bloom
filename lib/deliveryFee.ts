/**
 * Delivery fee calculation for Stripe Checkout and order creation.
 * Uses district-based rules from lib/deliveryFees.ts.
 * Server is source of truth; never trust client-provided fee.
 */

import { calcDeliveryFeeTHB, type DistrictKey } from '@/lib/deliveryFees';

export interface DeliveryInput {
  address?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  /** District key from dropdown. Required for fee calculation. */
  deliveryDistrict?: DistrictKey;
  /** Central Chiang Mai toggle (Old City / Nimman / etc). Only applies when district is MUEANG. */
  isMueangCentral?: boolean;
}

/**
 * Get delivery fee in THB from district + central toggle.
 * Falls back to 500 THB (unknown) when district not provided.
 */
export function getDeliveryFeeTHB(input?: DeliveryInput): number {
  const district = (input?.deliveryDistrict as DistrictKey) ?? 'UNKNOWN';
  const isMueangCentral = input?.isMueangCentral ?? false;
  return calcDeliveryFeeTHB({ district, isMueangCentral });
}
