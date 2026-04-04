import type { Order } from '@/lib/orders';
import type { ContactPreferenceOption } from '@/lib/orders/types';
import type {
  OrderItemAddOnsDisplay,
  SupabaseOrderItemRow,
  SupabaseOrderRow,
} from '@/lib/supabase/adminQueries';

export type OrderSummaryItemRow = SupabaseOrderItemRow & {
  catalogHref?: string;
  addOns?: OrderItemAddOnsDisplay;
};

const CONTACT_PREF_LABELS: Record<ContactPreferenceOption, string> = {
  phone: 'Phone',
  line: 'LINE',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
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

export function preferredContactDisplay(order: SupabaseOrderRow): string {
  const prefs = parseContactPreference(order.contact_preference);
  return prefs.length > 0
    ? prefs.map((opt) => CONTACT_PREF_LABELS[opt]).join(' · ')
    : 'N/A';
}

function parseContactPreference(raw: string | null | undefined): ContactPreferenceOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<ContactPreferenceOption>(['phone', 'line', 'telegram', 'whatsapp']);
    const out: ContactPreferenceOption[] = [];
    for (const x of parsed) {
      if (typeof x === 'string' && allowed.has(x as ContactPreferenceOption)) {
        out.push(x as ContactPreferenceOption);
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

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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

  lines.push('ORDER SUMMARY');
  lines.push('');
  lines.push(`Order ID: ${naText(order.order_id)}`);
  lines.push(`Created: ${formatDate(order.created_at)}`);
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
      const type = (item.item_type ?? 'bouquet') === 'product' ? 'Product' : 'Bouquet';
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

  return lines.join('\n');
}
