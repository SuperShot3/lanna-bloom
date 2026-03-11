/**
 * Core analytics helpers for GTM dataLayer pushes plus purchase dedupe.
 * Used by lib/analytics.ts. GTM is loaded in components/GoogleAnalytics.tsx.
 *
 * Purchase: we only push { event: 'purchase', ... } to window.dataLayer.
 * GTM is the only system that sends purchase to GA4 (no direct gtag/GA4 calls).
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

export function getPurchaseGuardDebug(orderId: string): {
  storageKey: string;
  localStorageSent: boolean;
  sessionStorageSent: boolean;
} {
  const key = getPurchaseStorageKey(orderId);
  if (typeof window === 'undefined') {
    return {
      storageKey: key,
      localStorageSent: false,
      sessionStorageSent: false,
    };
  }

  return {
    storageKey: key,
    localStorageSent: hasPurchaseSentFlag(window.localStorage, key),
    sessionStorageSent: hasPurchaseSentFlag(window.sessionStorage, key),
  };
}

/**
 * Check if purchase was already sent for this orderId (prevents duplicate on refresh/back).
 */
export function wasPurchaseSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  const debug = getPurchaseGuardDebug(orderId);
  return debug.localStorageSent || debug.sessionStorageSent;
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
 * Fire purchase event exactly once per order. Deduped by orderId.
 * Guard runs BEFORE any dataLayer push: check sessionStorage → set → push.
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
  const key = getPurchaseStorageKey(orderId);

  // Strong guard BEFORE any push: atomic check-and-set so only first call pushes
  try {
    if (window.sessionStorage.getItem(key) === '1') {
      if (isDev) {
        console.info('[analytics] purchase duplicate prevented by sessionStorage guard (no dataLayer push)', {
          orderId,
          transactionId,
        });
      }
      return;
    }
    window.sessionStorage.setItem(key, '1');
  } catch {
    return;
  }
  markPurchaseSent(orderId);

  const ensuredItems = items.map((it, i) => ({
    ...it,
    quantity: it.quantity ?? 1,
    index: it.index ?? i,
    currency: it.currency ?? currency,
  }));

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'purchase',
    transaction_id: transactionId,
    value,
    currency,
    items: ensuredItems,
  });
  if (isDev) {
    console.info('[analytics] purchase pushed to dataLayer once — GTM will send to GA4', {
      orderId,
      transactionId,
    });
  }
}
