import type { OrderDeliveryDestinationId } from '@/lib/orders';

/** Per-destination item multipliers (1.3 = +30%). Delivery fees are not marked up. */
export const EXPANSION_ITEM_MARKUP: Partial<Record<OrderDeliveryDestinationId, number>> = {
  PHUKET: 1.3,
  SAMUI: 1.3,
  KRABI: 1.3,
  BANGKOK: 1.2,
  PAI: 1.2,
};

export const EXPANSION_MARKUP_DESTINATIONS = new Set<OrderDeliveryDestinationId>(
  Object.keys(EXPANSION_ITEM_MARKUP) as OrderDeliveryDestinationId[]
);

export function roundToNearest10Thb(amountThb: number): number {
  if (!Number.isFinite(amountThb)) return 0;
  return Math.round(amountThb / 10) * 10;
}

export function applyExpansionItemMarkupThb(
  amountThb: number,
  destination: OrderDeliveryDestinationId
): number {
  if (!Number.isFinite(amountThb)) return 0;
  const multiplier = EXPANSION_ITEM_MARKUP[destination];
  if (multiplier == null) return Math.round(amountThb);
  return roundToNearest10Thb(amountThb * multiplier);
}
