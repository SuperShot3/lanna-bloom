/**
 * Server-side order pricing for Stripe. Never trust client totals.
 * Fetches prices from Sanity and computes items, add-ons, delivery fee.
 */

import { getBouquetById } from '@/lib/sanity';
import { getDeliveryFeeTHB, type DeliveryInput } from '@/lib/deliveryFee';
import type { OrderCardType, OrderWrappingOption } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';

/** Premium/beautiful card add-on price (THB). Must match AddOnsSection.CARD_BEAUTIFUL_PRICE_THB. */
const CARD_BEAUTIFUL_PRICE_THB = 20;

export interface CartItemIdentifier {
  bouquetId: string;
  bouquetSlug?: string;
  size: string;
  addOns: {
    cardType: OrderCardType;
    cardMessage: string;
    wrappingOption: OrderWrappingOption;
  };
  imageUrl?: string;
}

export interface ComputedOrderItem {
  bouquetId: string;
  bouquetTitle: string;
  size: string;
  price: number;
  addOns: {
    cardType: OrderCardType;
    cardMessage: string;
    wrappingOption: OrderWrappingOption;
  };
  imageUrl?: string;
  bouquetSlug?: string;
}

export interface ComputedOrderTotals {
  items: ComputedOrderItem[];
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
}

/**
 * Compute order totals from cart identifiers. Fetches prices from Sanity.
 * Never accepts price/total from client.
 */
export async function computeOrderTotals(
  cartItems: CartItemIdentifier[],
  delivery: DeliveryInput,
  lang: Locale
): Promise<{ ok: true; totals: ComputedOrderTotals } | { ok: false; message: string }> {
  if (!cartItems?.length) {
    return { ok: false, message: 'Cart is empty' };
  }

  const items: ComputedOrderItem[] = [];
  let itemsTotal = 0;

  for (const item of cartItems) {
    const bouquet = await getBouquetById(item.bouquetId);
    if (!bouquet) {
      return { ok: false, message: `Bouquet not found: ${item.bouquetId}` };
    }

    const sizeKey = (item.size?.toLowerCase() || 'm') as 's' | 'm' | 'l' | 'xl';
    const size = bouquet.sizes?.find((s) => s.key === sizeKey) ?? bouquet.sizes?.[0];
    if (!size) {
      return { ok: false, message: `Bouquet ${bouquet.slug} has no sizes` };
    }

    let itemPrice = size.price ?? 0;
    // Client sends 'beautiful'; Stripe API maps it to 'premium' before this runs
    if (item.addOns?.cardType === 'premium') {
      itemPrice += CARD_BEAUTIFUL_PRICE_THB;
    }

    const bouquetTitle = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
    items.push({
      bouquetId: bouquet.id,
      bouquetTitle,
      size: size.label ?? sizeKey.toUpperCase(),
      price: itemPrice,
      addOns: {
        cardType: item.addOns?.cardType ?? null,
        cardMessage: item.addOns?.cardMessage?.trim() ?? '',
        wrappingOption: item.addOns?.wrappingOption ?? null,
      },
      imageUrl: item.imageUrl,
      bouquetSlug: item.bouquetSlug ?? bouquet.slug,
    });
    itemsTotal += itemPrice;
  }

  const deliveryFee = getDeliveryFeeTHB(delivery);
  const grandTotal = itemsTotal + deliveryFee;

  return {
    ok: true,
    totals: {
      items,
      itemsTotal,
      deliveryFee,
      grandTotal,
    },
  };
}
