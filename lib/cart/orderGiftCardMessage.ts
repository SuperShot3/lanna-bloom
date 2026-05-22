import type { CartItem } from '@/contexts/CartContext';
import { clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';

/** Index of the first bouquet line — checkout gift message UI uses this line. */
export function findPrimaryBouquetIndex(items: CartItem[]): number {
  return items.findIndex((i) => (i.itemType ?? 'bouquet') === 'bouquet');
}

/** Read the order-level gift card message (primary bouquet line, else persisted draft). */
export function readOrderGiftCardMessage(items: CartItem[], draft: string): string {
  const idx = findPrimaryBouquetIndex(items);
  if (idx >= 0) {
    return items[idx].addOns.cardMessage ?? '';
  }
  return draft;
}

export function clipOrderGiftCardMessage(message: string): string {
  return clipCheckoutField(message, 'giftCardMessage');
}

/** Apply message to every bouquet cart line (one card message per order). */
export function applyOrderGiftCardMessageToItems(
  items: CartItem[],
  message: string
): CartItem[] {
  const clipped = clipOrderGiftCardMessage(message);
  return items.map((item) =>
    (item.itemType ?? 'bouquet') === 'bouquet'
      ? { ...item, addOns: { ...item.addOns, cardMessage: clipped } }
      : item
  );
}
