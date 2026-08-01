import {
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clipGiftCardMessage,
  normalizeGiftCardMessagesForPersist,
  normalizeGiftCardMessagesForUi,
} from '@/lib/orders/giftCardMessages';

export {
  GIFT_CARD_MESSAGES_MAX_COUNT,
  clipGiftCardMessage,
  normalizeGiftCardMessagesForPersist,
  normalizeGiftCardMessagesForUi,
};

/** Index of the first bouquet line — gift message UI is shown when a bouquet exists. */
export function findPrimaryBouquetIndex(
  items: Array<{ itemType?: string }>
): number {
  return items.findIndex((i) => (i.itemType ?? 'bouquet') === 'bouquet');
}

/** @deprecated Use normalizeGiftCardMessagesForUi / cart draft array. */
export function clipOrderGiftCardMessage(message: string): string {
  return clipGiftCardMessage(message);
}

/** Clear per-item card messages (order-level messages live on cart draft / order.giftCardMessages). */
export function clearItemCardMessages<T extends { itemType?: string; addOns: { cardMessage?: string } }>(
  items: T[]
): T[] {
  return items.map((item) =>
    (item.itemType ?? 'bouquet') === 'bouquet'
      ? { ...item, addOns: { ...item.addOns, cardMessage: '' } }
      : item
  );
}
