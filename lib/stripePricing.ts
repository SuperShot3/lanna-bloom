/**
 * Server-side order pricing for Stripe. Never trust client totals.
 * Fetches prices from Sanity and computes items, add-ons, delivery fee.
 */

import {
  getBalloonById,
  getBouquetById,
  getBouquetBySlugFromSanity,
  getPlushyToyById,
  getProductById,
} from '@/lib/sanity';
import { resolveBouquetOptionFromIdentifier } from '@/lib/bouquetOptions';
import { getDeliveryFeeTHB, type DeliveryInput } from '@/lib/deliveryFees';
import type { OrderCardType, OrderWrappingOption } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { getAddOnsTotal, type ProductAddOnsSelected } from '@/lib/addonsConfig';

/** Premium/beautiful card add-on price (THB). Must match AddOnsSection.CARD_BEAUTIFUL_PRICE_THB. */
const CARD_BEAUTIFUL_PRICE_THB = 20;

export interface CartItemIdentifier {
  itemType?: 'bouquet' | 'product' | 'plushyToy' | 'balloon';
  bouquetId: string;
  bouquetSlug?: string;
  size: string;
  addOns: {
    cardType: OrderCardType;
    cardMessage: string;
    wrappingOption: OrderWrappingOption;
    productAddOns?: ProductAddOnsSelected;
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
  itemType?: 'bouquet' | 'product' | 'plushyToy' | 'balloon';
  cost?: number;
  commissionAmount?: number;
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
    const isProduct = item.itemType === 'product';
    const isPlushyToy = item.itemType === 'plushyToy';
    const isBalloon = item.itemType === 'balloon';

    if (isPlushyToy) {
      const toy = await getPlushyToyById(item.bouquetId);
      if (!toy) {
        return { ok: false, message: `Plushy toy not found: ${item.bouquetId}` };
      }
      const finalPrice = toy.price;
      let itemPrice = finalPrice;
      if (item.addOns?.cardType === 'premium') {
        itemPrice += CARD_BEAUTIFUL_PRICE_THB;
      }
      itemPrice += getAddOnsTotal(item.addOns?.productAddOns ?? {});

      const toyTitle = lang === 'th' && toy.nameTh ? toy.nameTh : toy.nameEn;
      const sizeLabel = (item.size || toy.sizeLabel || '—').trim() || '—';
      items.push({
        bouquetId: toy.id,
        bouquetTitle: toyTitle,
        size: sizeLabel,
        price: itemPrice,
        addOns: {
          cardType: item.addOns?.cardType ?? null,
          cardMessage: item.addOns?.cardMessage?.trim() ?? '',
          wrappingOption: item.addOns?.wrappingOption ?? null,
        },
        imageUrl: item.imageUrl ?? toy.imageUrl,
        bouquetSlug: item.bouquetSlug,
        itemType: 'plushyToy',
        cost: undefined,
        commissionAmount: undefined,
      });
      itemsTotal += itemPrice;
    } else if (isBalloon) {
      const balloon = await getBalloonById(item.bouquetId);
      if (!balloon) {
        return { ok: false, message: `Balloon not found: ${item.bouquetId}` };
      }
      const finalPrice = balloon.price;
      let itemPrice = finalPrice;
      if (item.addOns?.cardType === 'premium') {
        itemPrice += CARD_BEAUTIFUL_PRICE_THB;
      }
      itemPrice += getAddOnsTotal(item.addOns?.productAddOns ?? {});

      const balloonTitle = lang === 'th' && balloon.nameTh ? balloon.nameTh : balloon.nameEn;
      const sizeLabel = (item.size || balloon.sizeLabel || '—').trim() || '—';
      items.push({
        bouquetId: balloon.id,
        bouquetTitle: balloonTitle,
        size: sizeLabel,
        price: itemPrice,
        addOns: {
          cardType: item.addOns?.cardType ?? null,
          cardMessage: item.addOns?.cardMessage?.trim() ?? '',
          wrappingOption: item.addOns?.wrappingOption ?? null,
        },
        imageUrl: item.imageUrl ?? balloon.imageUrl,
        bouquetSlug: item.bouquetSlug,
        itemType: 'balloon',
        cost: undefined,
        commissionAmount: undefined,
      });
      itemsTotal += itemPrice;
    } else if (isProduct) {
      const product = await getProductById(item.bouquetId);
      if (!product) {
        return { ok: false, message: `Product not found: ${item.bouquetId}` };
      }
      if (product.moderationStatus !== 'live') {
        return { ok: false, message: `Product is not available: ${product.nameEn}` };
      }

      const partnerCost = product.cost ?? product.price ?? 0;
      const finalPrice = computeFinalPrice(partnerCost, product.commissionPercent);
      const commissionAmount = finalPrice - partnerCost;
      let itemPrice = finalPrice;
      if (item.addOns?.cardType === 'premium') {
        itemPrice += CARD_BEAUTIFUL_PRICE_THB;
      }
      itemPrice += getAddOnsTotal(item.addOns?.productAddOns ?? {});

      const productTitle = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
      items.push({
        bouquetId: product.id,
        bouquetTitle: productTitle,
        size: '—',
        price: itemPrice,
        addOns: {
          cardType: item.addOns?.cardType ?? null,
          cardMessage: item.addOns?.cardMessage?.trim() ?? '',
          wrappingOption: item.addOns?.wrappingOption ?? null,
        },
        imageUrl: item.imageUrl ?? product.imageUrl,
        bouquetSlug: item.bouquetSlug,
        itemType: 'product',
        cost: partnerCost,
        commissionAmount,
      });
      itemsTotal += itemPrice;
    } else {
      const bouquet =
        (item.bouquetSlug ? await getBouquetBySlugFromSanity(item.bouquetSlug) : null) ??
        (await getBouquetById(item.bouquetId));
      if (!bouquet) {
        return { ok: false, message: `Bouquet not found: ${item.bouquetId}` };
      }

      const size =
        resolveBouquetOptionFromIdentifier(bouquet, item.size) ?? bouquet.sizes?.[0];
      if (!size) {
        return { ok: false, message: `Bouquet ${bouquet.slug} has no sizes` };
      }

      let itemPrice = size.price ?? 0;
      if (item.addOns?.cardType === 'premium') {
        itemPrice += CARD_BEAUTIFUL_PRICE_THB;
      }
      itemPrice += getAddOnsTotal(item.addOns?.productAddOns ?? {});

      const bouquetTitle = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
      items.push({
        bouquetId: bouquet.id,
        bouquetTitle,
        size: size.label,
        price: itemPrice,
        addOns: {
          cardType: item.addOns?.cardType ?? null,
          cardMessage: item.addOns?.cardMessage?.trim() ?? '',
          wrappingOption: item.addOns?.wrappingOption ?? null,
        },
        imageUrl: item.imageUrl,
        bouquetSlug: item.bouquetSlug ?? bouquet.slug,
        itemType: 'bouquet',
      });
      itemsTotal += itemPrice;
    }
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
