'use client';

import type { CatalogProduct } from '@/lib/catalog/types';
import type { Locale } from '@/lib/i18n';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { useCart } from '@/contexts/CartContext';
import { getDefaultAddOns } from '@/components/addOns';
import { trackAddToCart, trackRemoveFromCart } from '@/lib/analytics';
import { getProductDisplayCategory } from '@/lib/catalogCategories';
import { useCheckoutDeliveryProfile } from '@/hooks/useCheckoutDeliveryProfile';

/** Shared "gift add-on" cart toggle — used by both the carousel tiles and the "View all" popup. */
export function useGiftCartToggle(lang: Locale) {
  const { addItem, removeItem, items } = useCart();
  const checkoutProfile = useCheckoutDeliveryProfile(lang);
  const defaultAddOns = getDefaultAddOns();

  const findCartIndex = (product: CatalogProduct) =>
    items.findIndex(
      (i) =>
        i.bouquetId === product.id &&
        i.itemType === 'product' &&
        i.size.optionId === 'product_default' &&
        (i.addOns.cardMessage ?? '').trim() === (defaultAddOns.cardMessage ?? '').trim() &&
        JSON.stringify(i.addOns.productAddOns ?? {}) === JSON.stringify(defaultAddOns.productAddOns ?? {})
    );

  const isInCart = (product: CatalogProduct) => findCartIndex(product) >= 0;

  const toggleGift = (product: CatalogProduct) => {
    const name = lang === 'th' && product.nameTh ? product.nameTh : product.nameEn;
    const imgSrc = product.images?.[0] ?? '';
    const finalPrice = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
    const index = findCartIndex(product);

    if (index >= 0) {
      removeItem(index);
      trackRemoveFromCart({
        currency: 'THB',
        value: finalPrice,
        items: [
          {
            item_id: product.id,
            item_name: name,
            price: finalPrice,
            quantity: 1,
            index: 0,
            item_category: getProductDisplayCategory(product),
          },
        ],
      });
      return;
    }

    const syntheticSize = {
      optionId: 'product_default',
      key: 'm' as const,
      label: '—',
      price: finalPrice,
      description: '',
      preparationTime: undefined as number | undefined,
      availability: true,
    };
    addItem(
      {
        itemType: 'product',
        bouquetId: product.id,
        slug: product.slug,
        nameEn: product.nameEn,
        nameTh: product.nameTh ?? product.nameEn,
        imageUrl: imgSrc,
        size: syntheticSize,
        addOns: defaultAddOns,
        excludedDeliveryDestinations: product.excludedDeliveryDestinations,
        deliveryDestination: checkoutProfile.destinationId,
        ...(product.discountPercent != null && {
          catalogDiscountPercent: product.discountPercent,
        }),
      },
      1
    );
    trackAddToCart({
      currency: 'THB',
      value: finalPrice,
      items: [
        {
          item_id: product.id,
          item_name: name,
          price: finalPrice,
          quantity: 1,
          index: 0,
          item_category: getProductDisplayCategory(product),
        },
      ],
    });
  };

  return { isInCart, toggleGift };
}
