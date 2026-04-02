import type { CartItem } from '@/contexts/CartContext';
import type { LineDraftCartItem } from '@/lib/line-draft/types';

/** Map LINE draft item to cart item (fills optional BouquetSize / add-on fields). */
export function lineDraftItemToCartItem(raw: LineDraftCartItem): CartItem {
  return {
    itemType: raw.itemType,
    bouquetId: raw.bouquetId,
    slug: raw.slug,
    nameEn: raw.nameEn,
    nameTh: raw.nameTh,
    imageUrl: raw.imageUrl,
    quantity: raw.quantity ?? 1,
    size: {
      optionId:
        raw.size.optionId ??
        (raw.size.key ? `legacy_${raw.size.key}` : 'legacy_m'),
      key: raw.size.key,
      label: raw.size.label ?? String(raw.size.key ?? ''),
      price: raw.size.price,
      description: raw.size.description ?? '',
      preparationTime: raw.size.preparationTime,
      availability: raw.size.availability,
    },
    addOns: {
      cardType: raw.addOns.cardType,
      cardMessage: raw.addOns.cardMessage ?? '',
      wrappingPreference: raw.addOns.wrappingPreference ?? null,
      productAddOns: raw.addOns.productAddOns ?? {},
    },
  };
}
