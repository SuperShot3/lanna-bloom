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

/** Purchase dedupe: storage key format per spec */
const PURCHASE_SENT_PREFIX = 'purchase_sent:';

function getPurchaseStorageKey(orderId: string): string {
  return `${PURCHASE_SENT_PREFIX}${orderId}`;
}

function hasPurchaseSentFlag(storage: Storage | undefined, key: string): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Check if purchase was already sent for this orderId (prevents duplicate on refresh/back).
 */
export function wasPurchaseSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = getPurchaseStorageKey(orderId);
  return hasPurchaseSentFlag(window.localStorage, key) || hasPurchaseSentFlag(window.sessionStorage, key);
}

/**
 * Mark purchase as sent. Call BEFORE sending to avoid race in React Strict Mode double-mount.
 */
function markPurchaseSent(orderId: string): void {
  if (typeof window === 'undefined') return;
  const key = getPurchaseStorageKey(orderId);
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.setItem(key, '1');
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

  console.info('[analytics] trackPurchase called', {
    orderId,
    transactionId,
    value,
    itemCount: items.length,
  });

  if (wasPurchaseSent(orderId)) {
    console.info('[analytics] purchase send prevented by guard', {
      orderId,
      transactionId,
    });
    return;
  }

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

  console.info('[analytics] purchase pushed to dataLayer', {
    orderId,
    transactionId,
  });
}
