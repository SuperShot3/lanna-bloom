/**
 * Client-safe delivery location request helpers (no server-only imports).
 */

import type { CartItem } from '@/contexts/CartContext';
import { clipCheckoutField } from '@/lib/checkout/checkoutFieldLimits';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';
import type { Locale } from '@/lib/i18n';

export const DELIVERY_LOCATION_TEXT_MAX = 300;

export function clipLocationText(value: string): string {
  return value.slice(0, DELIVERY_LOCATION_TEXT_MAX);
}

export function hasDeliveryLocationInput(locationText: string, googleMapsUrl: string): boolean {
  const text = locationText.trim();
  const maps = googleMapsUrl.trim();
  if (text.length > 0) return true;
  return maps.length > 0 && isValidGoogleMapsUrl(maps);
}

export function buildCartSummaryForLocationRequest(items: CartItem[], lang: Locale): string {
  const lines: string[] = [];
  items.forEach((item, i) => {
    const name = lang === 'th' ? item.nameTh : item.nameEn;
    lines.push(`${i + 1}. ${name} — ${item.size.label} — ฿${item.size.price.toLocaleString()}`);
  });
  return lines.join('\n');
}

export function isValidDeliveryLocationEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 80) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function buildDeliveryLocationRequestMessage(params: {
  lang: Locale;
  locationText: string;
  googleMapsUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  cartSummary: string;
}): string {
  const {
    lang,
    locationText,
    googleMapsUrl,
    customerName,
    customerEmail,
    customerPhone,
    cartSummary,
  } = params;
  const intro =
    lang === 'th'
      ? 'สวัสดีครับ/ค่ะ ผม/ดิฉันไม่พบพื้นที่จัดส่งในรายการ — ช่วยเช็คว่าจัดส่งได้ไหม?'
      : "Hi! I can't find my delivery area in the list — can you check if you deliver to my location?";

  const parts = [intro, ''];
  if (locationText.trim()) {
    parts.push(
      lang === 'th' ? `ที่อยู่/พื้นที่: ${locationText.trim()}` : `Location: ${locationText.trim()}`
    );
  }
  if (googleMapsUrl.trim()) {
    parts.push(
      lang === 'th'
        ? `Google Maps: ${googleMapsUrl.trim()}`
        : `Google Maps: ${googleMapsUrl.trim()}`
    );
  }
  parts.push(
    lang === 'th'
      ? `ชื่อ: ${customerName}\nอีเมล: ${customerEmail.trim()}`
      : `Name: ${customerName}\nEmail: ${customerEmail.trim()}`
  );
  if (customerPhone?.trim()) {
    parts.push(lang === 'th' ? `โทร: ${customerPhone.trim()}` : `Phone: ${customerPhone.trim()}`);
  }
  if (cartSummary.trim()) {
    parts.push('');
    parts.push(lang === 'th' ? 'ตะกร้า:' : 'Cart:');
    parts.push(cartSummary.trim());
  }
  parts.push('');
  parts.push(
    lang === 'th'
      ? 'ตะกร้าของผม/ดิฉันถูกบันทึกไว้แล้ว — รอการยืนยันจากทีมงานครับ/ค่ะ'
      : 'My cart is saved — waiting for your confirmation. Thank you!'
  );
  return parts.join('\n');
}
