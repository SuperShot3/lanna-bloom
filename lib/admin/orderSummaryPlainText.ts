import type { Order } from '@/lib/orders';
import type { ContactPreferenceStored } from '@/lib/orders/types';
import type {
  OrderItemAddOnsDisplay,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
} from '@/lib/supabase/adminQueries';
import { formatShopDateTime } from '@/lib/shopTime';

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

function orderJsonDelivery(order: SupabaseOrderRow): Order['delivery'] | undefined {
  const o = order.order_json as Partial<Order> | null | undefined;
  return o?.delivery;
}

export function checkoutMapsUrl(order: SupabaseOrderRow): string | null {
  const col = order.delivery_google_maps_url?.trim();
  if (col) return col;
  const u = orderJsonDelivery(order)?.deliveryGoogleMapsUrl?.trim();
  return u || null;
}

export function recipientNameDisplay(order: SupabaseOrderRow): string {
  const col = order.recipient_name?.trim();
  if (col) return col;
  return orderJsonDelivery(order)?.recipientName?.trim() ?? '';
}

export function recipientPhoneDisplay(order: SupabaseOrderRow): string {
  const col = order.recipient_phone?.trim();
  if (col) return col;
  return orderJsonDelivery(order)?.recipientPhone?.trim() ?? '';
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

/**
 * One block to paste to a driver on LINE/Messenger: time, place, pin, recipient, card text, order ref.
 */
export function buildDriverMessengerPlainText(
  order: SupabaseOrderRow,
  items: OrderSummaryItemRow[],
  customGreetingCard?: string | null
): string {
  const mapsUrl = checkoutMapsUrl(order);
  const rName = recipientNameDisplay(order);
  const rPhone = recipientPhoneDisplay(order);
  const surprise = surpriseDeliveryAdminLabel(order);
  const cardBlock = buildClipboardCardText(items, customGreetingCard);

  const datePart = order.delivery_date?.trim() ?? '';
  const windowPart = order.delivery_window?.trim() ?? '';
  const when = [datePart, windowPart].filter(Boolean).join(' · ') || 'N/A';

  const lines: string[] = [];
  lines.push(`Order: ${order.order_id}`);
  lines.push('');
  lines.push(`When: ${when}`);
  if (order.district?.trim()) {
    lines.push(`Area: ${order.district.trim()}`);
  }
  lines.push('');
  lines.push('Address:');
  lines.push(naText(order.address));
  lines.push('');
  if (mapsUrl) {
    lines.push('Google Maps pin:');
    lines.push(mapsUrl);
    lines.push('');
  }
  lines.push('Recipient:');
  lines.push(`Name: ${naText(rName)}`);
  lines.push(`Phone: ${naText(rPhone)}`);
  lines.push(`Surprise delivery: ${surprise}`);
  lines.push('');
  lines.push(`Sender / customer phone: ${naText(order.phone)}`);
  lines.push('');
  if (cardBlock.trim()) {
    lines.push('Card message:');
    lines.push(cardBlock);
  } else {
    lines.push('Card message: —');
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
  lines.push(`  Phone: ${naText(order.phone)}`);
  lines.push(`  Preferred contact: ${preferredContactDisplay(order)}`);
  lines.push('');
  lines.push('Items');
  if (items.length === 0) {
    lines.push('  (No line items)');
  } else {
    items.forEach((item, i) => {
      const type = (item.item_type ?? 'bouquet') === 'bouquet' ? 'Bouquet' : 'Product';
      lines.push(`  ${i + 1}. ${naText(item.bouquet_title)} (${type})`);
      lines.push(
        `     Size: ${naText(item.size)} | Qty: 1 | Price: ${formatAmountNa(item.price)}`
      );
      if (item.addOns?.cardMessage?.trim()) {
        lines.push(`     Card text: "${item.addOns.cardMessage.trim()}"`);
      }
      if (item.addOns?.cardType != null) {
        lines.push(`     Card: ${item.addOns.cardType === 'premium' ? 'Premium' : 'Free'}`);
      }
      if (item.addOns?.wrappingOption) {
        lines.push(`     Wrapping: ${getWrappingLabel(item.addOns.wrappingOption)}`);
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
  lines.push(`  Address: ${naText(order.address)}`);
  lines.push(`  Google Maps (checkout): ${mapsUrl ?? 'N/A'}`);
  lines.push('');
  lines.push('Recipient');
  lines.push(`  Name: ${naText(rName)}`);
  lines.push(`  Phone: ${naText(rPhone)}`);
  lines.push(`  Surprise delivery: ${surprise}`);

  return lines.join('\n');
}
