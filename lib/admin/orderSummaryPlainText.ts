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

/** Driver-facing delivery directions entered at checkout (room, gate code, landmark, etc.). */
export function deliveryNotesDisplay(order: SupabaseOrderRow): string {
  return orderJsonDelivery(order)?.notes?.trim() ?? '';
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

const DRIVER_FALLBACK_IF_NO_RECIPIENT_TH =
  'ถ้าไม่เจอใคร วรรณโทรให้รบกวนบอกวรร';

/** English empty-field label for admin copy / UI. */
export const MISSING_EN = 'Missing';

/** Thai empty-field label for driver LINE paste. */
export const MISSING_TH = 'ขาดหาย';

/** Normalize supplier ready time toward driver style (`8.30`, `14.00`). */
export function formatSupplierReadyTimeForDriver(raw: string | null | undefined): string {
  const t = raw?.trim() ?? '';
  if (!t) return '';
  const m = t.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return t.replace(/\s+/g, '');
  const hour = String(Number(m[1]));
  return `${hour}.${m[2]}`;
}

function pickupShopPhraseTh(shopName: string | null | undefined): string {
  const shop = shopName?.trim() ?? '';
  if (!shop) return '';
  if (shop.startsWith('ร้าน')) return `รับดอกไม้${shop}`;
  return `รับดอกไม้ร้าน${shop}`;
}

/** First line when ready: `8.30 รับดอกไม้ร้านต้อย` (no date; omit if nothing confirmed). */
export function buildDriverPickupHeadline(order: SupabaseOrderRow): string {
  const timePart = formatSupplierReadyTimeForDriver(order.confirmed_supplier_ready_time);
  const shopPart = pickupShopPhraseTh(order.confirmed_supplier_shop_name);
  return [timePart || null, shopPart || null].filter(Boolean).join(' ');
}

function recipientPhoneDigitsForDriver(order: SupabaseOrderRow): string {
  const full =
    order.recipient_phone?.trim() || orderJsonDelivery(order)?.recipientPhone?.trim() || '';
  if (!full) return '';
  const cc = recipientPhoneCountryCodeDigits(order);
  if (cc && full.startsWith(cc)) {
    const national = full.slice(cc.length).replace(/\D/g, '');
    if (cc === '66' && national) {
      return national.startsWith('0') ? national : `0${national}`;
    }
    return national || full.replace(/\D/g, '');
  }
  return full.replace(/\D/g, '') || full;
}

function isForeignRecipientPhone(order: SupabaseOrderRow): boolean {
  const cc = recipientPhoneCountryCodeDigits(order);
  return Boolean(cc && cc !== '66');
}

/**
 * Recipient name + phone + checkout driver notes (+ card text) for “Copy driver notes”.
 * Empty fields use English `Missing`. Blank line between notes and card.
 */
export function buildDriverNotesClipboardText(
  order: SupabaseOrderRow,
  items?: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const name = recipientNameDisplay(order).trim() || MISSING_EN;
  const phone = recipientPhoneDigitsForDriver(order) || MISSING_EN;
  const phoneLine = phone !== MISSING_EN && isForeignRecipientPhone(order)
    ? `Recipient phone (foreign): ${phone}`
    : `Recipient phone: ${phone}`;
  const notes = deliveryNotesDisplay(order).trim();
  const notesLine = notes ? `Driver notes: ${notes}` : `Driver notes: ${MISSING_EN}`;
  const cardFromItems = items?.length
    ? buildClipboardCardText(items, customGreetingCard).trim()
    : '';
  const card = cardFromItems || cardTextFromBoardOrder(order).trim();
  const cardLine = card ? `Card text: ${card}` : `Card text: ${MISSING_EN}`;

  return [`Recipient name: ${name}`, phoneLine, '', notesLine, '', cardLine].join('\n');
}

/** Card message for clipboard; always includes status (`Missing` when empty). */
export function buildCardTextClipboardText(
  items: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const card = buildClipboardCardText(items, customGreetingCard).trim();
  return card ? `Card text: ${card}` : `Card text: ${MISSING_EN}`;
}

/** Card text from board order `order_json` (no separate items query). */
export function cardTextFromBoardOrder(order: SupabaseOrderRow): string {
  const json = order.order_json as {
    items?: Array<{ addOns?: { cardMessage?: string } }>;
    customOrderDetails?: { greetingCard?: string };
  } | null | undefined;
  const messages: string[] = [];
  if (Array.isArray(json?.items)) {
    for (const it of json.items) {
      const msg = typeof it?.addOns?.cardMessage === 'string' ? it.addOns.cardMessage.trim() : '';
      if (msg) messages.push(msg);
    }
  }
  const greeting =
    typeof json?.customOrderDetails?.greetingCard === 'string'
      ? json.customOrderDetails.greetingCard.trim()
      : '';
  if (greeting) messages.push(greeting);
  return messages.join('\n\n');
}

/** Preview string for delivery-board cards (same empty fallback). */
export function cardTextDisplayOrNone(cardMessage: string | null | undefined): string {
  return cardMessage?.trim() || MISSING_EN;
}

export function driverNotesDisplayOrNone(notes: string | null | undefined): string {
  return notes?.trim() || MISSING_EN;
}

/** Customer name + phone for clipboard (Copy customer details). */
export function buildCustomerDetailsClipboardText(order: SupabaseOrderRow): string {
  const name = order.customer_name?.trim() || MISSING_EN;
  const phone = customerPhoneDisplay(order).trim() || MISSING_EN;
  return `Name: ${name}\nPhone: ${phone}`;
}

/**
 * Compact Thai guidance block for driver LINE/Messenger.
 * Always includes driver notes + card text; empty fields use Thai “ขาดหาย”.
 */
export function buildDriverMessengerPlainText(
  order: SupabaseOrderRow,
  items?: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const lines: string[] = [];
  const headline = buildDriverPickupHeadline(order);
  if (headline) {
    lines.push(headline);
    lines.push('');
  }

  const name = recipientNameDisplay(order).trim() || MISSING_TH;
  lines.push(`ชื่อผู้รับ  ${name}`);

  const phone = recipientPhoneDigitsForDriver(order);
  if (phone) {
    lines.push(
      isForeignRecipientPhone(order)
        ? `เบอร์ผู้รับเป็นต่างชาติ  ${phone}`
        : `เบอร์ผู้รับ  ${phone}`
    );
  } else {
    lines.push(`เบอร์ผู้รับ  ${MISSING_TH}`);
  }
  lines.push(DRIVER_FALLBACK_IF_NO_RECIPIENT_TH);
  lines.push('');

  const address = customerDeliveryAddressRaw(order).trim() || MISSING_TH;
  lines.push(`ส่งที่ ${address}`);
  lines.push('');

  const notes = deliveryNotesDisplay(order).trim();
  lines.push(notes ? `หมายเหตุคนขับ: ${notes}` : `หมายเหตุคนขับ: ${MISSING_TH}`);
  lines.push('');

  const cardFromItems = items?.length
    ? buildClipboardCardText(items, customGreetingCard).trim()
    : '';
  const card = cardFromItems || cardTextFromBoardOrder(order).trim();
  lines.push(card ? `ข้อความการ์ด: ${card}` : `ข้อความการ์ด: ${MISSING_TH}`);

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
  const deliveryNotes = driverNotesDisplayOrNone(deliveryNotesDisplay(order));
  const delivery = orderJsonDelivery(order);
  const rName = recipientNameDisplay(order);
  const rPhone = recipientPhoneDisplay(order);
  const surprise = surpriseDeliveryAdminLabel(order);
  const cardText = buildClipboardCardText(items).trim() || MISSING_EN;
  const dest = order.delivery_destination?.trim() || delivery?.deliveryDestination?.trim() || '';
  const zoneId = order.delivery_zone?.trim() || delivery?.deliveryZoneId?.trim() || '';
  const postcode = order.postal_code?.trim() || delivery?.postalCode?.trim() || '';
  const legacyDistrict = order.district?.trim() || '';

  lines.push(`Delivery for : ${naText(order.delivery_date)}`);
  lines.push(`  Window: ${naText(order.delivery_window)}`);
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
  lines.push(`Address: ${naText(customerDeliveryAddressRaw(order))}  Driver notes: ${deliveryNotes}`);
  lines.push('');
  lines.push(`Card text:  "${cardText}"`);
  lines.push('');
  if (dest) {
    lines.push(`Destination: ${destinationDisplayName(dest as DeliveryDestinationId, 'en')} `);
  }
  if (zoneId && dest) {
    lines.push(`Zone: ${zoneLabel(dest as DeliveryDestinationId, zoneId, 'en') ?? zoneId} `);
  } else if (legacyDistrict) {
    lines.push(`Zone: ${legacyDistrict} `);
  }
  if (postcode) {
    lines.push(`Postcode: ${postcode}`);
  }
  lines.push('');
  lines.push(`Google Maps (checkout): ${mapsUrl ?? 'N/A'}`);
  lines.push('');
  lines.push('Recipient');
  lines.push(`  Name: ${naText(rName)}`);
  lines.push(`  Phone: ${naText(rPhone)}`);
  lines.push(`  Surprise delivery: ${surprise}`);
  lines.push('');
  lines.push(`Order ID: ${naText(order.order_id)}`);
  lines.push(`Created: ${formatShopDateTime(order.created_at, 'N/A')}`);

  return lines.join('\n');
}

/** Build summary clipboard text from a delivery-board order (`order_json` line items). */
export function buildOrderSummaryPlainTextFromBoardOrder(order: SupabaseOrderRow): string {
  const json = order.order_json as {
    items?: Array<{
      bouquetTitle?: string;
      addOns?: OrderItemAddOnsDisplay;
    }>;
    customOrderDetails?: { greetingCard?: string };
  } | null | undefined;

  const items: OrderSummaryItemRow[] = Array.isArray(json?.items)
    ? json!.items!.map((it) => ({
        order_id: order.order_id,
        bouquet_id: null,
        bouquet_title: typeof it.bouquetTitle === 'string' ? it.bouquetTitle : null,
        size: null,
        price: null,
        image_url_snapshot: null,
        addOns: it.addOns,
      }))
    : [];

  const greeting =
    typeof json?.customOrderDetails?.greetingCard === 'string'
      ? json.customOrderDetails.greetingCard
      : null;

  // Reuse summary builder; inject custom greeting as a synthetic card line when needed.
  if (greeting?.trim() && !items.some((i) => i.addOns?.cardMessage?.trim())) {
    items.push({
      order_id: order.order_id,
      bouquet_id: null,
      bouquet_title: 'Custom order',
      size: null,
      price: null,
      image_url_snapshot: null,
      addOns: { cardMessage: greeting.trim() },
    });
  }

  return buildOrderSummaryPlainText(order, items);
}
