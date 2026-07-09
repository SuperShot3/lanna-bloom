import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

const WINDOW_ORDER: Record<string, number> = {
  MORNING_9_12: 0,
  MIDDAY_12_15: 1,
  AFTERNOON_15_18: 2,
  EVENING_18_20: 3,
};

export type DeliveryDayPart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'unknown';

export function deliveryWindowRank(window: string | null | undefined): number {
  if (!window?.trim()) return 99;
  return WINDOW_ORDER[window.trim()] ?? 50;
}

export function dayPartFromWindow(window: string | null | undefined): DeliveryDayPart {
  const w = (window ?? '').trim();
  if (w === 'MORNING_9_12') return 'morning';
  if (w === 'MIDDAY_12_15') return 'midday';
  if (w === 'AFTERNOON_15_18') return 'afternoon';
  if (w === 'EVENING_18_20') return 'evening';
  return 'unknown';
}

const WINDOW_LABEL: Record<string, string> = {
  MORNING_9_12: '09:00–12:00',
  MIDDAY_12_15: '12:00–15:00',
  AFTERNOON_15_18: '15:00–18:00',
  EVENING_18_20: '18:00–20:00',
};

export function formatDeliveryWindowLabel(window: string | null | undefined): string {
  if (!window?.trim()) return '—';
  return WINDOW_LABEL[window.trim()] ?? window.replace(/_/g, ' ');
}

/** Short readable delivery date in shop TZ (for admin cards). */
export function formatDeliveryDateCard(ymd: string | null | undefined): string {
  if (!ymd?.trim()) return '—';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return ymd;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${ymd.trim()}T12:00:00+07:00`));
}

interface JsonItem {
  bouquetId?: string;
  imageUrl?: string;
  bouquetTitle?: string;
  itemType?: string;
  /** Bouquet option label at checkout (S/M/L, stem counts, Thai copy, etc.). */
  size?: string;
  /** Cart quantity when persisted on the line (optional). */
  quantity?: number;
  addOns?: { cardMessage?: string };
}

/** Single-letter / short legacy size codes including N/XL-style variants. */
const LEGACY_SIZE_CODE = /^(S|M|L|XL|N|X)$/i;

function isPlaceholderSize(s: string): boolean {
  const t = s.trim();
  if (!t || t === '—') return true;
  return t.toLowerCase() === 'quote pending';
}

/** Checkout expands `quantity` into repeated line items; treat identical rows as one unit count. */
function stripeExpandedUnitsForFirstLine(items: JsonItem[]): number | null {
  if (!Array.isArray(items) || items.length <= 1) return null;
  const [a, ...rest] = items;
  const key = (it: JsonItem) =>
    `${it.bouquetId ?? ''}|${typeof it.size === 'string' ? it.size.trim() : ''}|${(it.itemType ?? 'bouquet').toLowerCase()}`;
  const k0 = key(a);
  if (rest.some((it) => key(it) !== k0)) return null;
  return items.length;
}

/**
 * Compact size / stem label + optional quantity for the first line item (admin delivery thumb).
 */
export function firstLineItemSpecSummary(order: SupabaseOrderRow): string | null {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const items = json?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const it = items[0];
  const rawSize = typeof it.size === 'string' ? it.size.trim() : '';
  const qtyRaw = it.quantity;
  const fromExpansion = stripeExpandedUnitsForFirstLine(items);
  const qtyFromField =
    typeof qtyRaw === 'number' && Number.isFinite(qtyRaw) && qtyRaw > 1 ? Math.floor(qtyRaw) : null;
  const qty = fromExpansion && fromExpansion > 1 ? fromExpansion : qtyFromField;

  const parts: string[] = [];
  if (qty) parts.push(`×${qty}`);

  if (rawSize && !isPlaceholderSize(rawSize)) {
    if (LEGACY_SIZE_CODE.test(rawSize)) {
      parts.push(`Size ${rawSize.toUpperCase()}`);
    } else {
      parts.push(rawSize);
    }
  }

  if (!parts.length) return null;
  return parts.join(' · ');
}

interface JsonDelivery {
  deliveryLat?: number;
  deliveryLng?: number;
  address?: string;
}

interface LooseOrderJson {
  items?: JsonItem[];
  delivery?: JsonDelivery;
  customOrderDetails?: { referenceImageUrl?: string; greetingCard?: string };
}

export function customerCardMessagePreview(order: SupabaseOrderRow): string {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const messages: string[] = [];
  const items = json?.items;
  if (Array.isArray(items)) {
    for (const it of items) {
      const msg = typeof it?.addOns?.cardMessage === 'string' ? it.addOns.cardMessage.trim() : '';
      if (msg) messages.push(msg);
    }
  }
  const greeting =
    typeof json?.customOrderDetails?.greetingCard === 'string'
      ? json.customOrderDetails.greetingCard.trim()
      : '';
  if (greeting) messages.push(greeting);
  return messages.join(' / ');
}

/** True when the customer provided greeting/card text (checkout card message or custom-order message card). */
export function orderHasCustomerCardMessage(order: SupabaseOrderRow): boolean {
  return Boolean(customerCardMessagePreview(order));
}

export function firstLineImageFromOrder(order: SupabaseOrderRow): string | null {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const items = json?.items;
  if (Array.isArray(items) && items.length > 0) {
    const u = items[0]?.imageUrl?.trim();
    if (u) return u;
  }
  const ref = json?.customOrderDetails?.referenceImageUrl?.trim();
  if (ref) return ref;
  return null;
}

export function firstLineProductLabel(order: SupabaseOrderRow): string {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const items = json?.items;
  if (Array.isArray(items) && items.length > 0) {
    const it = items[0];
    const title = it?.bouquetTitle?.trim();
    if (title) return title;
    const t = it?.itemType?.trim();
    if (t) return itemTypeDisplayLabel(t);
  }
  return 'Order';
}

export function allProductLabels(order: SupabaseOrderRow, max = 4): string[] {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const items = Array.isArray(json?.items) ? json.items : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const title = typeof it?.bouquetTitle === 'string' ? it.bouquetTitle.trim() : '';
    const fallback = typeof it?.itemType === 'string' ? itemTypeDisplayLabel(it.itemType.trim()) : '';
    const label = title || fallback;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= max) return out;
  }
  return out.length > 0 ? out : ['Order'];
}

export function itemTypeDisplayLabel(itemType: string): string {
  const u = itemType.toLowerCase();
  if (u === 'bouquet') return 'Bouquet';
  if (u === 'product') return 'Product';
  if (u === 'plushytoy' || u === 'plushtoy' || u === 'plushy toy') return 'Plush toy';
  if (u === 'balloon') return 'Balloon';
  return itemType.replace(/_/g, ' ');
}

export function deliveryCoordsFromOrder(order: SupabaseOrderRow): { lat: number; lng: number } | null {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const lat = json?.delivery?.deliveryLat;
  const lng = json?.delivery?.deliveryLng;
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

export function orderImagePreviews(order: SupabaseOrderRow, max = 4): string[] {
  return orderProductThumbPreviews(order, max).map((p) => p.imageUrl);
}

export interface OrderProductThumbPreview {
  imageUrl: string;
  label: string;
  spec: string | null;
}

function itemSpecSummary(it: JsonItem, qtyOverride?: number | null): string | null {
  const rawSize = typeof it.size === 'string' ? it.size.trim() : '';
  const qtyRaw = it.quantity;
  const qtyFromField =
    typeof qtyRaw === 'number' && Number.isFinite(qtyRaw) && qtyRaw > 1 ? Math.floor(qtyRaw) : null;
  const qty = qtyOverride && qtyOverride > 1 ? qtyOverride : qtyFromField;
  const parts: string[] = [];
  if (qty) parts.push(`×${qty}`);
  if (rawSize && !isPlaceholderSize(rawSize)) {
    if (LEGACY_SIZE_CODE.test(rawSize)) {
      parts.push(`Size ${rawSize.toUpperCase()}`);
    } else {
      parts.push(rawSize);
    }
  }
  return parts.length ? parts.join(' · ') : null;
}

/** Unique product image + matching label/spec for delivery-board thumbnails. */
export function orderProductThumbPreviews(
  order: SupabaseOrderRow,
  max = 4
): OrderProductThumbPreview[] {
  const json = order.order_json as LooseOrderJson | null | undefined;
  const items = Array.isArray(json?.items) ? json.items : [];
  const seen = new Set<string>();
  const out: OrderProductThumbPreview[] = [];

  for (const it of items) {
    const raw = typeof it?.imageUrl === 'string' ? it.imageUrl.trim() : '';
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const title = typeof it?.bouquetTitle === 'string' ? it.bouquetTitle.trim() : '';
    const fallback =
      typeof it?.itemType === 'string' ? itemTypeDisplayLabel(it.itemType.trim()) : '';
    out.push({
      imageUrl: raw,
      label: title || fallback || 'Order',
      spec: itemSpecSummary(it),
    });
    if (out.length >= max) return out;
  }

  const ref = json?.customOrderDetails?.referenceImageUrl?.trim();
  if (ref && !seen.has(ref) && out.length < max) {
    out.push({ imageUrl: ref, label: 'Custom order', spec: null });
  }
  return out;
}

export function sortOrdersForBoard(list: SupabaseOrderRow[]): SupabaseOrderRow[] {
  return [...list].sort((a, b) => {
    const ad = (a.delivery_date ?? '').localeCompare(b.delivery_date ?? '');
    if (ad !== 0) return ad;
    const aw = deliveryWindowRank(a.delivery_window);
    const bw = deliveryWindowRank(b.delivery_window);
    if (aw !== bw) return aw - bw;
    const at = a.created_at ?? '';
    const bt = b.created_at ?? '';
    return bt.localeCompare(at);
  });
}

export function groupOrdersByDayPart(
  list: SupabaseOrderRow[]
): Record<DeliveryDayPart, SupabaseOrderRow[]> {
  const empty: Record<DeliveryDayPart, SupabaseOrderRow[]> = {
    morning: [],
    midday: [],
    afternoon: [],
    evening: [],
    unknown: [],
  };
  for (const o of list) {
    empty[dayPartFromWindow(o.delivery_window)].push(o);
  }
  return empty;
}
