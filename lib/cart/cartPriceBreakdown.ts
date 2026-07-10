import type { CartItem } from '@/contexts/CartContext';
import { getAddOnsTotal } from '@/lib/addonsConfig';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';
import type { OrderDeliveryDestinationId } from '@/lib/orders';
import { applyPeakCelebrationMarkupThb } from '@/lib/promo/peakCelebrationPricing';

export function isNonBouquetCartLine(item: CartItem): boolean {
  return item.itemType === 'product' || item.itemType === 'plushyToy' || item.itemType === 'balloon';
}

export type CartPriceBreakdown = {
  /** Flower bouquet lines (size price only, with destination markup). */
  bouquetSubtotal: number;
  /** Gift add-ons on bouquet lines (chocolates, vase, teddy). */
  addOnsSubtotal: number;
  /** Partner products, plushy toys, balloons, etc. */
  otherItemsSubtotal: number;
  /** Sum of the three lines above; matches checkout / Stripe item totals. */
  itemsTotal: number;
};

export function cartPriceBreakdown(
  items: CartItem[],
  deliveryDestination: OrderDeliveryDestinationId,
  deliveryDateYmd?: string
): CartPriceBreakdown {
  const peakDate = deliveryDateYmd?.trim() ?? '';
  let bouquetSubtotal = 0;
  let addOnsSubtotal = 0;
  let otherItemsSubtotal = 0;

  for (const item of items) {
    const qty = item.quantity ?? 1;
    const addOnsUnit = getAddOnsTotal(item.addOns?.productAddOns ?? {});
    const basePrice = applyPeakCelebrationMarkupThb(item.size.price, peakDate);
    const unitMarked = applyExpansionItemMarkupThb(basePrice + addOnsUnit, deliveryDestination);

    if (isNonBouquetCartLine(item)) {
      otherItemsSubtotal += unitMarked * qty;
      continue;
    }

    const addOnsMarked = applyExpansionItemMarkupThb(addOnsUnit, deliveryDestination);
    const bouquetMarked = applyExpansionItemMarkupThb(basePrice, deliveryDestination);
    bouquetSubtotal += bouquetMarked * qty;
    addOnsSubtotal += addOnsMarked * qty;
  }

  return {
    bouquetSubtotal,
    addOnsSubtotal,
    otherItemsSubtotal,
    itemsTotal: bouquetSubtotal + addOnsSubtotal + otherItemsSubtotal,
  };
}

export function cartValue(
  items: CartItem[],
  deliveryDestination: OrderDeliveryDestinationId,
  deliveryDateYmd?: string
): number {
  return cartPriceBreakdown(items, deliveryDestination, deliveryDateYmd).itemsTotal;
}
