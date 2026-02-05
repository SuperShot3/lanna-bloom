/**
 * Build messenger deep links with pre-filled order message.
 * Contact number: +66803313431 — used for WhatsApp and Telegram.
 *
 * LINE:
 * - Prefill into a specific OA chat may not work on all platforms (desktop browser / not added OA).
 *   Keep the share fallback (getLineShareUrl) for reliability.
 * - Ensure LINE_OA_ID env value is exactly "@xxxx" from LINE OA manager settings (not the lin.ee link).
 */
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/** E.164 format, no + (used for WhatsApp; Telegram uses same number via +66803313431). */
const CONTACT_PHONE = '66803313431';

const WHATSAPP_PHONE = CONTACT_PHONE;
/** LINE Official Account ID including @ (e.g. @lannabloom). Must match LINE OA manager; use env NEXT_PUBLIC_LINE_OA_ID. */
const LINE_OA_ID = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LINE_OA_ID) || '@lannabloom';
/** LINE OA "Add friend" / open chat link (e.g. from lin.ee). Used for contact link when no prefill. */
const LINE_OA_LINK = 'https://lin.ee/zxg4N3F';
/** Telegram: link by phone number so all contact goes to +66803313431. */
const TELEGRAM_PHONE = '66803313431';
const FACEBOOK_PAGE = 'konstantin.polovnikov.3';

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function getWhatsAppOrderUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encode(message)}`;
}

/**
 * Primary: open LINE OA chat with pre-filled message (line.me/R/oaMessage/...).
 * OA ID and message are percent-encoded with encodeURIComponent.
 * May not work on desktop or if user has not added the OA; use getLineShareUrl as fallback.
 */
export function getLineOaChatUrl(message: string): string {
  const oaId = encodeURIComponent(LINE_OA_ID);
  const text = encodeURIComponent(message);
  return `https://line.me/R/oaMessage/${oaId}/?${text}`;
}

/**
 * Fallback: open LINE share screen (line.me/R/share?text=...). More reliable across devices.
 */
export function getLineShareUrl(message: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(message)}`;
}

/** LINE order URL: prefers OA chat; use getLineShareUrl when oaMessage is unreliable (e.g. desktop). */
export function getLineOrderUrl(message: string): string {
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
export function getLineContactUrl(): string {
  return LINE_OA_LINK;
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
