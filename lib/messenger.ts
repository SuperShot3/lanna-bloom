/**
 * Build messenger deep links with pre-filled order message.
 * Replace phone numbers and handles with your real ones.
 */
const WHATSAPP_PHONE = '66952572645'; // E.164, no +
const LINE_AT = 'yourshop'; // Replace with your LINE ID when you have one
const TELEGRAM_USER = 'konstantinMrk'; // Telegram username (no @)
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
  return `https://t.me/${TELEGRAM_USER}?text=${encode(message)}`;
}

export function getFacebookOrderUrl(message: string): string {
  const base = `https://www.facebook.com/${FACEBOOK_PAGE}`;
  return `${base}/messages?text=${encode(message)}`;
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
