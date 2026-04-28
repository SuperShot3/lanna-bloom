/**
 * Build messenger deep links with pre-filled order message.
 * Contact number: +66803313431 — used for WhatsApp.
 *
 * LINE:
 * - Contact-only mode: set NEXT_PUBLIC_LINE_OA_ADD_FRIEND_LINK to your shareable LINE link
 *   (e.g. line.me/ti/p/... or lin.ee/...).
 */
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/** E.164 format, no + (used for WhatsApp). */
const CONTACT_PHONE = '66803313431';

const WHATSAPP_PHONE = CONTACT_PHONE;
/** LINE contact link (contact-only). */
const LINE_ADD_FRIEND_LINK = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LINE_OA_ADD_FRIEND_LINK) || 'https://line.me/ti/p/4sZ7z5fYAB';
const FACEBOOK_PAGE = 'konstantin.polovnikov.3';

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function getWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encode(message)}`;
}

/** Backward-compatible alias used by order UIs; LINE always opens contact link. */
export function getLineOrderUrl(_message: string): string {
  return getLineContactUrl();
}

/** LINE contact link. */
export function getLineContactUrl(): string {
  if (LINE_ADD_FRIEND_LINK) return LINE_ADD_FRIEND_LINK;
  return 'https://line.me/ti/p/4sZ7z5fYAB';
}

export function getFacebookOrderUrl(message: string): string {
  const base = `https://www.facebook.com/${FACEBOOK_PAGE}`;
  return `${base}/messages?text=${encode(message)}`;
}

/** Base contact URLs (no pre-filled message) for header/footer links. */
export function getWhatsAppContactUrl(): string {
  return `https://wa.me/${WHATSAPP_PHONE}`;
}

export function getContactPhoneTelUrl(): string {
  return `tel:+${CONTACT_PHONE}`;
}

export function getContactPhoneDisplay(): string {
  return '+66 80 331 3431';
}

export function getFacebookContactUrl(): string {
  return `https://www.facebook.com/${FACEBOOK_PAGE}`;
}

export function buildOrderMessage(
  bouquetName: string,
  sizeLabel: string,
  template: string,
  options?: {
    address?: string;
    date?: string;
    templateWithDelivery?: string;
    addOnsSummary?: string;
  }
): string {
  const address = options?.address ?? '';
  const date = options?.date ?? '';
  const useDeliveryTemplate = (address || date) && options?.templateWithDelivery;
  const tpl = useDeliveryTemplate ? options!.templateWithDelivery! : template;
  let message = tpl
    .replace('{name}', bouquetName)
    .replace('{size}', sizeLabel)
    .replace('{address}', address || '—')
    .replace('{date}', date || '—');
  if (options?.addOnsSummary?.trim()) {
    message += '\n\n' + options.addOnsSummary.trim();
  }
  return message;
}

/** Item shape for cart order message (avoids importing full CartContext in lib). */
export interface CartOrderItem {
  nameEn: string;
  nameTh: string;
  size: { label: string; price: number };
  addOns: {
    cardType: 'free' | 'beautiful' | null;
    cardMessage: string;
    wrappingPreference: 'none' | 'classic' | 'premium' | null;
  };
}

function buildAddOnsSummaryForItem(
  addOns: CartOrderItem['addOns'],
  t: Record<string, string | number>
): string {
  if (addOns.cardMessage?.trim()) {
    return String(t.addOnsSummaryMessage).replace('{text}', addOns.cardMessage.trim());
  }
  return '';
}

export function buildCartOrderMessage(
  items: CartOrderItem[],
  deliveryAddress: string,
  deliveryDate: string,
  lang: Locale
): string {
  const { cart: tCart, buyNow: tBuyNow } = translations[lang];
  const lines: string[] = [String(tCart.orderSummary)];
  items.forEach((item, i) => {
    const name = lang === 'th' ? item.nameTh : item.nameEn;
    const itemLine = String(tCart.itemLine)
      .replace('{name}', name)
      .replace('{size}', item.size.label)
      .replace('{price}', String(item.size.price));
    lines.push(`${i + 1}. ${itemLine}`);
    const addOnsStr = buildAddOnsSummaryForItem(item.addOns, tBuyNow as Record<string, string | number>);
    if (addOnsStr) lines.push(`   ${addOnsStr}`);
  });
  lines.push('');
  lines.push(`${tCart.deliveryLabel}: ${deliveryAddress || '—'}`);
  lines.push(`${tCart.dateLabel}: ${deliveryDate || '—'}`);
  return lines.join('\n');
}
