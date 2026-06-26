import type { Order } from '@/lib/orders';
import type { ContactPreferenceStored } from '@/lib/orders/types';
import type {
  OrderItemAddOnsDisplay,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
} from '@/lib/supabase/adminQueries';
import { formatShopDateTime } from '@/lib/shopTime';
import {
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { zoneLabel } from '@/lib/delivery/zones';
import {
  getWrappingPaperColorLabel,
  isSpecificWrappingPaperColor,
} from '@/lib/wrappingPaperColors';

export type OrderSummaryItemRow = SupabaseOrderItemRow & {
  catalogHref?: string;
  addOns?: OrderItemAddOnsDisplay;
};

const CONTACT_PREF_LABELS: Record<ContactPreferenceStored, string> = {
  phone: 'Phone',
  line: 'LINE',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

function orderJsonPartial(order: SupabaseOrderRow): Partial<Order> | null | undefined {
  return order.order_json as Partial<Order> | null | undefined;
}

function orderJsonDelivery(order: SupabaseOrderRow): Order['delivery'] | undefined {
  return orderJsonPartial(order)?.delivery;
}

function looksLikeHttpUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Street / directions / pasted link as entered at checkout (column or order_json). */
export function customerDeliveryAddressRaw(order: SupabaseOrderRow): string {
  const col = order.address?.trim();
  if (col) return col;
  return orderJsonDelivery(order)?.address?.trim() ?? '';
}

function adminDeliveryGeographyLines(order: SupabaseOrderRow, lang: 'en' | 'th' = 'en'): string[] {
  const dest =
    order.delivery_destination?.trim() ||
    orderJsonDelivery(order)?.deliveryDestination?.trim();
  const zoneId =
    order.delivery_zone?.trim() || orderJsonDelivery(order)?.deliveryZoneId?.trim();
  const postal =
    order.postal_code?.trim() || orderJsonDelivery(order)?.postalCode?.trim();
  const isThai = lang === 'th';
  const lines: string[] = [];
  if (dest) {
    const id = dest as DeliveryDestinationId;
    lines.push(
      isThai
        ? `พื้นที่จัดส่ง: ${destinationDisplayName(id, 'th')} (${dest})`
        : `Destination: ${destinationDisplayName(id, 'en')} (${dest})`
    );
  }
  if (dest && zoneId) {
    const id = dest as DeliveryDestinationId;
    const lbl = zoneLabel(id, zoneId, lang);
    lines.push(isThai ? `โซน: ${lbl ?? zoneId} (${zoneId})` : `Zone: ${lbl ?? zoneId} (${zoneId})`);
  }
  if (postal) lines.push(isThai ? `รหัสไปรษณีย์: ${postal}` : `Postcode: ${postal}`);
  const leg = order.district?.trim();
  if (leg && (!dest || !zoneId)) {
    lines.push(isThai ? `เขต/อำเภอเดิม: ${leg}` : `Legacy district: ${leg}`);
  }
  return lines;
}

/** Admin / driver copy: show +calling national when we stored the checkout calling code. */
export function formatInternationalPhoneAdmin(
  fullDigits: string | null | undefined,
  countryCodeDigits: string | null | undefined
): string {
  const phone = fullDigits?.trim();
  if (!phone) return '';
  const cc = countryCodeDigits?.replace(/\D/g, '').trim();
  if (!cc || !phone.startsWith(cc)) return phone;
  const national = phone.slice(cc.length);
  return national ? `+${cc} ${national}` : `+${cc}`;
}

function customerPhoneCountryCodeDigits(order: SupabaseOrderRow): string | undefined {
  const col = order.phone_country_code?.trim();
  if (col) return col.replace(/\D/g, '');
  return orderJsonPartial(order)?.phoneCountryCode?.replace(/\D/g, '');
}

function recipientPhoneCountryCodeDigits(order: SupabaseOrderRow): string | undefined {
  const col = order.recipient_phone_country_code?.trim();
  if (col) return col.replace(/\D/g, '');
  return orderJsonDelivery(order)?.recipientPhoneCountryCode?.replace(/\D/g, '');
}

/** Customer phone for admin UI and clipboard (includes +country when stored). */
export function customerPhoneDisplay(order: SupabaseOrderRow): string {
  const full = order.phone?.trim() || orderJsonPartial(order)?.phone?.trim() || '';
  if (!full) return '';
  return formatInternationalPhoneAdmin(full, customerPhoneCountryCodeDigits(order));
}

export function checkoutMapsUrl(order: SupabaseOrderRow): string | null {
  const col = order.delivery_google_maps_url?.trim();
  if (col) return col;
  const u = orderJsonDelivery(order)?.deliveryGoogleMapsUrl?.trim();
  if (u) return u;
  const addr = customerDeliveryAddressRaw(order);
  if (addr && looksLikeHttpUrl(addr)) return addr.trim();
  return null;
}

export function recipientNameDisplay(order: SupabaseOrderRow): string {
  const col = order.recipient_name?.trim();
  if (col) return col;
  return orderJsonDelivery(order)?.recipientName?.trim() ?? '';
}

export function recipientPhoneDisplay(order: SupabaseOrderRow): string {
  const full =
    order.recipient_phone?.trim() || orderJsonDelivery(order)?.recipientPhone?.trim() || '';
  if (!full) return '';
  return formatInternationalPhoneAdmin(full, recipientPhoneCountryCodeDigits(order));
}

/** Admin label for surprise delivery; N/A when recipient name is missing (same as Name: N/A). */
export function surpriseDeliveryAdminLabel(order: SupabaseOrderRow): string {
  const rName = recipientNameDisplay(order);
  if (!rName.trim()) return 'N/A';
  const v = orderJsonDelivery(order)?.surpriseDelivery;
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
}

export function preferredContactDisplay(order: SupabaseOrderRow): string {
  const prefs = parseContactPreference(order.contact_preference);
  return prefs.length > 0
    ? prefs.map((opt) => CONTACT_PREF_LABELS[opt]).join(' · ')
    : 'N/A';
}

/** LINE handle / ID from checkout when customer chose LINE as a contact channel (stored in `order_json`). */
export function customerLineIdDisplay(order: SupabaseOrderRow): string {
  const raw = orderJsonPartial(order)?.lineId;
  return typeof raw === 'string' ? raw.trim() : '';
}

function parseContactPreference(raw: string | null | undefined): ContactPreferenceStored[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<ContactPreferenceStored>(['phone', 'line', 'telegram', 'whatsapp']);
    const out: ContactPreferenceStored[] = [];
    for (const x of parsed) {
      if (typeof x === 'string' && allowed.has(x as ContactPreferenceStored)) {
        out.push(x as ContactPreferenceStored);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Missing optional text fields (use in UI and plain-text copy). */
export function naText(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? t : 'N/A';
}

export function formatAmountNa(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return `฿${Number(n).toLocaleString()}`;
}

/**
 * Plain text for clipboard: card messages from line items plus optional custom-order greeting.
 */
export function buildClipboardCardText(
  items: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const withMsg = items.filter((i) => i.addOns?.cardMessage?.trim());
  const fromItems: string[] = [];
  items.forEach((item, i) => {
    const msg = item.addOns?.cardMessage?.trim();
    if (!msg) return;
    if (withMsg.length > 1) {
      const title = item.bouquet_title?.trim() || `Item ${i + 1}`;
      fromItems.push(`${title}: ${msg}`);
    } else {
      fromItems.push(msg);
    }
  });
  const g = customGreetingCard?.trim();
  const blocks: string[] = [];
  if (fromItems.length) {
    blocks.push(fromItems.join('\n\n'));
  }
  if (g) {
    blocks.push(fromItems.length > 0 ? `Custom order (message card):\n${g}` : g);
  }
  return blocks.join('\n\n---\n\n');
}

function buildDriverClipboardCardTextThai(
  items: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const withMsg = items.filter((i) => i.addOns?.cardMessage?.trim());
  const fromItems: string[] = [];
  items.forEach((item, i) => {
    const msg = item.addOns?.cardMessage?.trim();
    if (!msg) return;
    if (withMsg.length > 1) {
      const title = item.bouquet_title?.trim() || `รายการที่ ${i + 1}`;
      fromItems.push(`${title}: ${msg}`);
    } else {
      fromItems.push(msg);
    }
  });
  const g = customGreetingCard?.trim();
  const blocks: string[] = [];
  if (fromItems.length) {
    blocks.push(fromItems.join('\n\n'));
  }
  if (g) {
    blocks.push(fromItems.length > 0 ? `ออเดอร์พิเศษ (ข้อความในการ์ด):\n${g}` : g);
  }
  return blocks.join('\n\n---\n\n');
}

function buildClipboardBalloonText(items: OrderSummaryItemRow[]): string {
  const withText = items.filter((i) => i.addOns?.balloonText?.trim());
  const lines: string[] = [];
  items.forEach((item, i) => {
    const text = item.addOns?.balloonText?.trim();
    if (!text) return;
    if (withText.length > 1) {
      const title = item.bouquet_title?.trim() || `Item ${i + 1}`;
      lines.push(`${title}: ${text}`);
    } else {
      lines.push(text);
    }
  });
  return lines.join('\n\n');
}

function surpriseDeliveryDriverThaiLabel(order: SupabaseOrderRow): string {
  const rName = recipientNameDisplay(order);
  if (!rName.trim()) return 'ไม่ระบุ';
  const v = orderJsonDelivery(order)?.surpriseDelivery;
  if (v === true) return 'ใช่';
  if (v === false) return 'ไม่ใช่';
  return 'ไม่ระบุ';
}

/**
 * One Thai block to paste to a driver on LINE/Messenger: time, place, pin, recipient, card text, order ref.
 */
export function buildDriverMessengerPlainText(
  order: SupabaseOrderRow,
  items: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const mapsUrl = checkoutMapsUrl(order);
  const rName = recipientNameDisplay(order);
  const rPhone = recipientPhoneDisplay(order);
  const surprise = surpriseDeliveryDriverThaiLabel(order);
  const cardBlock = buildDriverClipboardCardTextThai(items, customGreetingCard);
  const balloonBlock = buildClipboardBalloonText(items);

  const datePart = order.delivery_date?.trim() ?? '';
  const windowPart = order.delivery_window?.trim() ?? '';
  const when = [datePart, windowPart].filter(Boolean).join(' · ') || 'ไม่ระบุ';

  const lines: string[] = [];
  lines.push(`ออเดอร์: ${order.order_id}`);
  lines.push('');
  lines.push(`เวลา: ${when}`);
  const geo = adminDeliveryGeographyLines(order, 'th');
  if (geo.length) {
    lines.push(...geo);
  } else if (order.district?.trim()) {
    lines.push(`พื้นที่: ${order.district.trim()}`);
  }
  lines.push('');
  lines.push('ที่อยู่:');
  lines.push(customerDeliveryAddressRaw(order).trim() || 'ไม่ระบุ');
  lines.push('');
  if (mapsUrl) {
    lines.push('พิน Google Maps:');
    lines.push(mapsUrl);
    lines.push('');
  }
  lines.push('ผู้รับ:');
  lines.push(`ชื่อ: ${rName.trim() || 'ไม่ระบุ'}`);
  lines.push(`โทร: ${rPhone.trim() || 'ไม่ระบุ'}`);
  lines.push(`เซอร์ไพรส์: ${surprise}`);
  lines.push('');
  lines.push(`เบอร์ผู้สั่ง/ลูกค้า: ${customerPhoneDisplay(order).trim() || 'ไม่ระบุ'}`);
  lines.push('');
  if (cardBlock.trim()) {
    lines.push('ข้อความในการ์ด:');
    lines.push(cardBlock);
  } else {
    lines.push('ข้อความในการ์ด: ไม่มี');
  }
  if (balloonBlock.trim()) {
    lines.push('');
    lines.push('ข้อความบนบอลลูน:');
    lines.push(balloonBlock);
  }

  return lines.join('\n');
}

function getWrappingLabel(opt: string | null | undefined): string {
  if (!opt) return 'N/A';
  const lower = String(opt).toLowerCase();
  if (lower === 'standard' || lower === 'classic') return 'Free';
  if (lower === 'premium') return 'Premium';
  if (lower === 'no paper' || lower === 'none') return 'No paper';
  return opt;
}

function getItemTypeLabel(type: string | null | undefined): string {
  if (type === 'product') return 'Product';
  if (type === 'plushyToy') return 'Plushy toy';
  if (type === 'balloon') return 'Balloon';
  return 'Bouquet';
}

/**
 * Plain-text block for clipboard: matches admin order summary sections.
 */
export function buildOrderSummaryPlainText(order: SupabaseOrderRow, items: OrderSummaryItemRow[]): string {
  const lines: string[] = [];
  const mapsUrl = checkoutMapsUrl(order);
  const rName = recipientNameDisplay(order);
  const rPhone = recipientPhoneDisplay(order);
  const surprise = surpriseDeliveryAdminLabel(order);

  lines.push('ORDER SUMMARY');
  lines.push('');
  lines.push(`Order ID: ${naText(order.order_id)}`);
  lines.push(`Created: ${formatShopDateTime(order.created_at, 'N/A')}`);
  lines.push('');
  lines.push('Customer');
  lines.push(`  Name: ${naText(order.customer_name)}`);
  lines.push(`  Email: ${naText(order.customer_email)}`);
  lines.push(`  Phone: ${naText(customerPhoneDisplay(order))}`);
  lines.push(`  Preferred contact: ${preferredContactDisplay(order)}`);
  const lineIdRow = customerLineIdDisplay(order);
  if (lineIdRow) {
    lines.push(`  LINE ID: ${lineIdRow}`);
  }
  lines.push('');
  lines.push('Items');
  if (items.length === 0) {
    lines.push('  (No line items)');
  } else {
    items.forEach((item, i) => {
      const type = getItemTypeLabel(item.item_type);
      lines.push(`  ${i + 1}. ${naText(item.bouquet_title)} (${type})`);
      lines.push(
        `     Size: ${naText(item.size)} | Qty: 1 | Price: ${formatAmountNa(item.price)}`
      );
      if (item.addOns?.cardMessage?.trim()) {
        lines.push(`     Card text: "${item.addOns.cardMessage.trim()}"`);
      }
      if (item.addOns?.balloonText?.trim()) {
        lines.push(`     Balloon text: "${item.addOns.balloonText.trim()}"`);
      }
      if (item.addOns?.cardType != null) {
        lines.push(`     Card: ${item.addOns.cardType === 'premium' ? 'Premium' : 'Free'}`);
      }
      if (item.addOns?.wrappingOption) {
        lines.push(`     Wrapping: ${getWrappingLabel(item.addOns.wrappingOption)}`);
      }
      if (isSpecificWrappingPaperColor(item.addOns?.paperColor)) {
        lines.push(
          `     Wrapping paper: ${getWrappingPaperColorLabel(item.addOns.paperColor, 'en')}`
        );
      }
      if (item.catalogHref) {
        lines.push(`     View on shop: ${item.catalogHref}`);
      }
    });
  }
  lines.push('');
  lines.push(`Items total: ${formatAmountNa(order.items_total)}`);
  lines.push(`Delivery fee: ${formatAmountNa(order.delivery_fee)}`);
  if (order.referral_discount != null && order.referral_discount > 0) {
    lines.push(`Discount: -${formatAmountNa(order.referral_discount)}`);
  }
  lines.push(`Grand total: ${formatAmountNa(order.grand_total)}`);
  lines.push('');
  lines.push('Delivery');
  lines.push(`  Date: ${naText(order.delivery_date)}`);
  lines.push(`  Window: ${naText(order.delivery_window)}`);
  for (const g of adminDeliveryGeographyLines(order)) {
    lines.push(`  ${g}`);
  }
  lines.push(`  Address: ${naText(customerDeliveryAddressRaw(order))}`);
  lines.push(`  Google Maps (checkout): ${mapsUrl ?? 'N/A'}`);
  lines.push('');
  lines.push('Recipient');
  lines.push(`  Name: ${naText(rName)}`);
  lines.push(`  Phone: ${naText(rPhone)}`);
  lines.push(`  Surprise delivery: ${surprise}`);

  return lines.join('\n');
}
