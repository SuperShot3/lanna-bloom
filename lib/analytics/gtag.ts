/**
 * Core analytics helpers for GTM dataLayer pushes plus purchase dedupe.
 * Used by lib/analytics.ts. GTM is loaded in components/GoogleAnalytics.tsx.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/** Purchase dedupe: localStorage key format per spec */
const PURCHASE_SENT_PREFIX = 'purchase_sent:';

/**
 * Check if purchase was already sent for this orderId (prevents duplicate on refresh/back).
 */
export function wasPurchaseSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(`${PURCHASE_SENT_PREFIX}${orderId}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Mark purchase as sent. Call BEFORE sending to avoid race in React Strict Mode double-mount.
 */
function markPurchaseSent(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${PURCHASE_SENT_PREFIX}${orderId}`, '1');
  } catch {
    // ignore
  }
}

/**
 * Push an event into the GTM dataLayer.
 */
export function trackEvent(eventName: string, eventParams: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...eventParams });
  if (isDev) console.debug('[Analytics dataLayer]', eventName, eventParams);
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

/**
 * Fire purchase event exactly once per order. Deduped by orderId via localStorage.
 * Call only when order payment is confirmed.
 */
export function trackPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: PurchaseItem[];
  transactionId?: string;
}): void {
  if (typeof window === 'undefined') return;

  const { orderId, value, currency = 'THB', items } = params;
  const transactionId = params.transactionId ?? orderId;

  if (wasPurchaseSent(orderId)) return;
  markPurchaseSent(orderId);

  const ensuredItems = items.map((it, i) => ({
    ...it,
    quantity: it.quantity ?? 1,
    index: it.index ?? i,
    currency: it.currency ?? currency,
  }));

  trackEvent('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    items: ensuredItems,
  });
}
