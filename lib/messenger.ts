/**
 * Build messenger deep links with pre-filled order message.
 * Contact number: +66803313431 — used for WhatsApp and Telegram.
 *
 * LINE:
 * - Personal account (no Official Account): set NEXT_PUBLIC_LINE_OA_ADD_FRIEND_LINK to your
 *   shareable LINE link (e.g. from LINE app: Profile → Share, or a lin.ee/xxxx link). Both
 *   "Contact LINE" and "Order via LINE" will use this link (no message prefill for personal).
 * - Official Account: set NEXT_PUBLIC_LINE_OA_ID to @your_oa_id; optionally set ADD_FRIEND_LINK
 *   to override the add-friend URL. Order button can open OA chat with prefilled message.
 */
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/** E.164 format, no + (used for WhatsApp; Telegram uses same number via +66803313431). */
const CONTACT_PHONE = '66803313431';

const WHATSAPP_PHONE = CONTACT_PHONE;
/** LINE Official Account ID including @ (only used when ADD_FRIEND_LINK is not set). */
const LINE_OA_ID = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LINE_OA_ID) || '@lannabloom';
/** LINE link for contact and (for personal accounts) order. Default: personal LINE add-friend link; override with NEXT_PUBLIC_LINE_OA_ADD_FRIEND_LINK. */
const LINE_ADD_FRIEND_LINK = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LINE_OA_ADD_FRIEND_LINK) || 'https://line.me/ti/p/4sZ7z5fYAB';
/** Telegram: link by phone number so all contact goes to +66803313431. */
const TELEGRAM_PHONE = '@Lannabloom';
const FACEBOOK_PAGE = 'konstantin.polovnikov.3';

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function getWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encode(message)}`;
}

/**
 * Open LINE OA chat with pre-filled message (Official Accounts only). Not used for personal LINE.
 */
export function getLineOaChatUrl(message: string): string {
  const oaId = encodeURIComponent(LINE_OA_ID);
  const text = encodeURIComponent(message);
  return `https://line.me/R/oaMessage/${oaId}/?${text}`;
}

/**
 * Open LINE share screen (line.me/R/share?text=...). Used as fallback for OA on desktop.
 */
export function getLineShareUrl(message: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(message)}`;
}

/** LINE order URL: when ADD_FRIEND_LINK is set (personal or custom), use that link (no prefill). Otherwise OA chat with message. */
export function getLineOrderUrl(message: string): string {
  if (LINE_ADD_FRIEND_LINK) return getLineContactUrl();
  return getLineOaChatUrl(message);
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
/** LINE contact link. When NEXT_PUBLIC_LINE_OA_ADD_FRIEND_LINK is set (personal or OA override), use it. Otherwise build OA add-friend URL from LINE_OA_ID (Official Accounts only). */
export function getLineContactUrl(): string {
  if (LINE_ADD_FRIEND_LINK) return LINE_ADD_FRIEND_LINK;
  const encodedId = encodeURIComponent(LINE_OA_ID);
  return `https://line.me/R/ti/p/${encodedId}`;
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
