import type { OrderDeliveryDestinationId } from '@/lib/orders';

export const EXPANSION_MARKUP_DESTINATIONS = new Set<OrderDeliveryDestinationId>([
  'PHUKET',
  'SAMUI',
]);

export const EXPANSION_MARKUP_MULTIPLIER = 1.3;

export function roundToNearest10Thb(amountThb: number): number {
  if (!Number.isFinite(amountThb)) return 0;
  return Math.round(amountThb / 10) * 10;
}

export function applyExpansionItemMarkupThb(
  amountThb: number,
  destination: OrderDeliveryDestinationId
): number {
  if (!Number.isFinite(amountThb)) return 0;
  if (!EXPANSION_MARKUP_DESTINATIONS.has(destination)) return Math.round(amountThb);
  return roundToNearest10Thb(amountThb * EXPANSION_MARKUP_MULTIPLIER);
}

