/**
 * Core GA4 gtag helpers – init once, trackEvent, trackPurchase with dedupe.
 * Used by lib/analytics.ts. GA4 script is loaded in components/GoogleAnalytics.tsx.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

const USE_GTM = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_GTM === 'true';
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
 * Send event to GA4 (gtag or dataLayer when GTM).
 */
export function trackEvent(eventName: string, eventParams: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  if (USE_GTM) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...eventParams });
    if (isDev) console.debug('[GA4 via GTM]', eventName, eventParams);
    return;
  }

  const doSend = () => {
    if (window.gtag) {
      window.gtag('event', eventName, eventParams);
      if (isDev) console.debug('[GA4]', eventName, eventParams);
      return true;
    }
    return false;
  };
  if (doSend()) return;
  let attempts = 0;
  const retry = () => {
    if (attempts++ >= 15) return;
    if (doSend()) return;
    setTimeout(retry, 100);
  };
  setTimeout(retry, 100);
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
 * Call only when order is confirmed paid (Stripe) or created (backend).
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
