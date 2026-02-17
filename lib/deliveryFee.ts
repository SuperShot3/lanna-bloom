/**
 * Delivery fee calculation for Stripe Checkout.
 * MVP: flat fee. Can be extended with district table or distance-based rules.
 */

/** Flat delivery fee in THB for Chiang Mai area. */
const FLAT_DELIVERY_FEE_THB = 100;

export interface DeliveryInput {
  address?: string;
  deliveryLat?: number;
  deliveryLng?: number;
}

/**
 * Get delivery fee in THB.
 * MVP: returns flat fee. Future: use address/coords for district or distance-based pricing.
 */
export function getDeliveryFeeTHB(_input?: DeliveryInput): number {
  return FLAT_DELIVERY_FEE_THB;
}
