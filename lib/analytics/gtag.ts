/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → window.dataLayer.push(...) → GTM → GA4.
 * The app NEVER calls gtag('event', ...) or loads gtag.js directly.
 * GTM is the single system responsible for sending events to GA4.
 *
 * Purchase dedupe: localStorage + sessionStorage per orderId.
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

/** Purchase dedupe: storage key format per spec. Always normalizes orderId so "LB-123" and "LB-123 " share one key. */
const PURCHASE_SENT_PREFIX = 'purchase_sent:';

function normalizeOrderId(orderId: string): string {
  return typeof orderId === 'string' ? orderId.trim() : '';
}

function getPurchaseStorageKey(orderId: string): string {
  return `${PURCHASE_SENT_PREFIX}${normalizeOrderId(orderId)}`;
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
 * Push a named event into the GTM dataLayer.
 * Delegates to pushToDataLayer — kept as a named export for callers.
 */
export function trackEvent(eventName: string, eventParams: Record<string, unknown>): void {
  pushToDataLayer(eventName, eventParams);
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
 * Guard runs BEFORE any dataLayer push: check both sessionStorage and localStorage
 * so cross-tab / new-session revisits do not push duplicate purchase.
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

  const normalizedOrderId = normalizeOrderId(params.orderId);
  if (!normalizedOrderId) return;

  // Guard FIRST: check both storages so only one push per order (cross-tab / revisit safe)
  if (wasPurchaseSent(normalizedOrderId)) {
    console.log('[stripe/purchase] trackPurchase: BLOCKED by dedupe guard — already sent for this orderId', {
      orderId: normalizedOrderId,
      ...getPurchaseGuardDebug(normalizedOrderId),
    });
    return;
  }
  markPurchaseSent(normalizedOrderId);

  const { value, currency = 'THB', items } = params;
  const transactionId = params.transactionId ? normalizeOrderId(params.transactionId) : normalizedOrderId;

  const ensuredItems = items.map((it, i) => ({
    ...it,
    quantity: it.quantity ?? 1,
    index: it.index ?? i,
    currency: it.currency ?? currency,
  }));

  pushToDataLayer('purchase', {
    transaction_id: transactionId,
    value,
    currency,
    items: ensuredItems,
  });
  console.log('[stripe/purchase] trackPurchase: pushed to dataLayer ✓ — GTM will forward to GA4', {
    orderId: normalizedOrderId,
    transaction_id: transactionId,
    value,
    currency,
    itemCount: ensuredItems.length,
  });
}

/** Dedupe key for Google Ads conversion (separate from GA4 purchase guard). */
const GOOGLE_ADS_CONVERSION_SENT_PREFIX = 'google_ads_conversion_sent:';

function getGoogleAdsConversionStorageKey(orderId: string): string {
  return `${GOOGLE_ADS_CONVERSION_SENT_PREFIX}${normalizeOrderId(orderId)}`;
}

function wasGoogleAdsConversionSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = getGoogleAdsConversionStorageKey(orderId);
  return (
    hasPurchaseSentFlag(window.localStorage, key) ||
    hasPurchaseSentFlag(window.sessionStorage, key)
  );
}

function markGoogleAdsConversionSent(orderId: string): void {
  if (typeof window === 'undefined') return;
  const key = getGoogleAdsConversionStorageKey(orderId);
  try {
    window.localStorage.setItem(key, '1');
    window.sessionStorage.setItem(key, '1');
  } catch {
    // ignore
  }
}

/**
 * Push google_ads_purchase to dataLayer for GTM → Google Ads Conversion tag.
 * Fires at most once per orderId (dedupe via localStorage/sessionStorage).
 * Call when user lands on paid order page (e.g. after Stripe redirect).
 */
export function trackGoogleAdsPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  transactionId?: string;
}): void {
  if (typeof window === 'undefined') return;

  const normalizedOrderId = normalizeOrderId(params.orderId);
  if (!normalizedOrderId) return;

  if (wasGoogleAdsConversionSent(normalizedOrderId)) {
    if (isDev) {
      console.debug('[analytics] google_ads_purchase duplicate prevented', { orderId: normalizedOrderId });
    }
    return;
  }
  markGoogleAdsConversionSent(normalizedOrderId);

  const transactionId = params.transactionId ? normalizeOrderId(params.transactionId) : normalizedOrderId;
  const currency = params.currency ?? 'THB';

  pushToDataLayer('google_ads_purchase', {
    transaction_id: transactionId,
    value: params.value,
    currency,
  });
  if (isDev) {
    console.info('[analytics] google_ads_purchase pushed to dataLayer — GTM can fire Google Ads Conversion', {
      orderId: normalizedOrderId,
      value: params.value,
      transactionId,
    });
  }
}
