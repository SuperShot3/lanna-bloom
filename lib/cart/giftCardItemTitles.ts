import type { CartItem } from '@/contexts/CartContext';
import type { Locale } from '@/lib/i18n';
import { GIFT_CARD_MESSAGES_MAX_COUNT } from '@/lib/orders/giftCardMessages';

/** Expanded cart unit titles (by quantity) for labeling gift cards. */
export function cartUnitTitlesForGiftCards(items: CartItem[], lang: Locale): string[] {
  const titles: string[] = [];
  for (const item of items) {
    const name =
      (lang === 'th' ? item.nameTh || item.nameEn : item.nameEn || item.nameTh)?.trim() ||
      'Item';
    const qty = Math.max(1, item.quantity ?? 1);
    for (let i = 0; i < qty; i++) {
      titles.push(name);
      if (titles.length >= GIFT_CARD_MESSAGES_MAX_COUNT) return titles;
    }
  }
  return titles;
}
