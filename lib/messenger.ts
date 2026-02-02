/**
 * Build messenger deep links with pre-filled order message.
 * Contact number: +66803313431 — used for WhatsApp and Telegram.
 */
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/** E.164 format, no + (used for WhatsApp; Telegram uses same number via +66803313431). */
const CONTACT_PHONE = '66803313431';

const WHATSAPP_PHONE = CONTACT_PHONE;
/** LINE uses LINE ID only (no phone in URL). Replace with your LINE ID linked to +66803313431. */
const LINE_AT = 'yourshop';
/** Telegram: link by phone number so all contact goes to +66803313431. */
const TELEGRAM_PHONE = '66803313431';
const FACEBOOK_PAGE = 'konstantin.polovnikov.3';

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function getWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encode(message)}`;
}

export function getLineOrderUrl(message: string): string {
  return `https://line.me/R/msg/p/${LINE_AT}?${encode(message)}`;
}

export function getTelegramOrderUrl(message: string): string {
  return `https://t.me/+${TELEGRAM_PHONE}?text=${encode(message)}`;
}

export function getFacebookOrderUrl(message: string): string {
  const base = `https://www.facebook.com/${FACEBOOK_PAGE}`;
  return `${base}/messages?text=${encode(message)}`;
}

/** Base contact URLs (no pre-filled message) for header/footer links. */
export function getWhatsAppContactUrl(): string {
  return `https://wa.me/${WHATSAPP_PHONE}`;
}
export function getTelegramContactUrl(): string {
  return `https://t.me/+${TELEGRAM_PHONE}`;
}
export function getLineContactUrl(): string {
  return `https://line.me/R/ti/p/@${LINE_AT}`;
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
  const lines: string[] = [];
  if (addOns.cardType === 'beautiful') {
    lines.push(String(t.addOnsSummaryCardBeautiful));
  } else if (addOns.cardType === 'free') {
    lines.push(String(t.addOnsSummaryCard).replace('{label}', String(t.cardFree)));
  }
  if (addOns.wrappingPreference === 'classic') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingClassic)));
  } else if (addOns.wrappingPreference === 'premium') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingPremium)));
  } else if (addOns.wrappingPreference === 'none') {
    lines.push(String(t.addOnsSummaryWrapping).replace('{label}', String(t.wrappingNone)));
  }
  if (addOns.cardMessage.trim()) {
    lines.push(String(t.addOnsSummaryMessage).replace('{text}', addOns.cardMessage.trim()));
  }
  return lines.join('. ');
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
