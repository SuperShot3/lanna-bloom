/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → `window.dataLayer.push(...)` → GTM. No `gtag('event', …)` in app code.
 *
 * **Paid order (browser):** `trackCheckoutPurchase` pushes **`purchase`** with **only** the GA4
 * `ecommerce` keys `transaction_id`, `value`, `currency`, and `items` (no root `order_id` or other
 * siblings). **GA4 revenue** is intended to come from this event via **GTM → GA4** (same as
 * `OrderPageClient`). **Dedupe:** localStorage `sent_purchase_*` per order id (refresh-safe).
 *
 * Pushes run **synchronously**; GTM replays the `dataLayer` queue after `gtm.js` loads.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/**
 * Safe helper for pushing events to the GTM dataLayer.
 * Every analytics event in the app MUST go through this function.
 */
export function pushToDataLayer(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
  if (isDev) console.debug('[pushToDataLayer]', eventName, params);
}

/**
 * Push a named event into the GTM dataLayer.
 * Delegates to pushToDataLayer — kept as a named export for callers.
 */
export function trackEvent(eventName: string, eventParams: Record<string, unknown>): void {
  pushToDataLayer(eventName, eventParams);
}

function normalizeOrderId(orderId: string): string {
  return typeof orderId === 'string' ? orderId.trim() : '';
}

function hasStorageSentFlag(storage: Storage | undefined, key: string): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  index?: number;
  item_category?: string;
  item_variant?: string;
  currency?: string;
}

/** Browser `purchase` dedupe (refresh-safe). */
const SENT_PURCHASE_PREFIX = 'sent_purchase_';

function getStandardPurchaseStorageKey(orderId: string): string {
  return `${SENT_PURCHASE_PREFIX}${normalizeOrderId(orderId)}`;
}

function wasStandardPurchaseSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  return hasStorageSentFlag(window.localStorage, getStandardPurchaseStorageKey(orderId));
}

function markStandardPurchaseSent(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStandardPurchaseStorageKey(orderId), '1');
  } catch {
    // ignore
  }
}

/**
 * Standard `purchase` on the paid order page — **once per order id** (localStorage).
 * Same shape as `OrderPageClient`; use via GTM for **GA4** and **Google Ads** (and similar).
 */
export function trackCheckoutPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: PurchaseItem[];
}): void {
  if (typeof window === 'undefined') return;

  const normalizedOrderId = normalizeOrderId(params.orderId);
  const value = Number(params.value);
  const currency = params.currency ?? 'THB';
  if (!normalizedOrderId || !Number.isFinite(value) || value <= 0) {
    return;
  }

  let itemsInput = params.items;
  if (itemsInput.length === 0 && value > 0) {
    itemsInput = [
      {
        item_id: normalizedOrderId,
        item_name: 'Purchase',
        price: value,
        quantity: 1,
      },
    ];
  }
  if (itemsInput.length === 0) {
    return;
  }

  if (wasStandardPurchaseSent(normalizedOrderId)) {
    if (isDev) {
      console.debug('[analytics] purchase duplicate prevented', { orderId: normalizedOrderId });
    }
    return;
  }

  const items = itemsInput.map((item) => ({
    item_id: item.item_id,
    item_name: item.item_name,
    price: item.price,
    quantity: item.quantity ?? 1,
  }));

  markStandardPurchaseSent(normalizedOrderId);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });

  pushToDataLayer('purchase', {
    ecommerce: {
      transaction_id: normalizedOrderId,
      value,
      currency,
      items,
    },
  });

  if (isDev) {
    console.info('[analytics] purchase pushed to dataLayer', {
      orderId: normalizedOrderId,
      value,
      itemCount: items.length,
    });
  }
}
