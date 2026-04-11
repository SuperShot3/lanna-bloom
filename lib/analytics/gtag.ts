/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → window.dataLayer.push(...) → GTM → GA4 / Ads.
 * The app NEVER calls gtag('event', ...) or loads gtag.js directly.
 *
 * **Purchase (ecommerce revenue):** `trackPurchase` pushes `purchase` to the dataLayer when the
 * customer views a **paid** order — GTM forwards to GA4. Deduped per orderId (localStorage + sessionStorage).
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

/** GA4 purchase dedupe: storage key per orderId. */
const PURCHASE_SENT_PREFIX = 'purchase_sent:';

function getPurchaseStorageKey(orderId: string): string {
  return `${PURCHASE_SENT_PREFIX}${normalizeOrderId(orderId)}`;
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
    localStorageSent: hasStorageSentFlag(window.localStorage, key),
    sessionStorageSent: hasStorageSentFlag(window.sessionStorage, key),
  };
}

export function wasPurchaseSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  const debug = getPurchaseGuardDebug(orderId);
  return debug.localStorageSent || debug.sessionStorageSent;
}

function markPurchaseSent(orderId: string): void {
  if (typeof window === 'undefined') return;
  const key = getPurchaseStorageKey(orderId);
  try {
    window.localStorage.setItem(key, '1');
    window.sessionStorage.setItem(key, '1');
  } catch {
    // ignore
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

/**
 * Fire purchase event at most once per orderId. GTM should forward to GA4.
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

  if (wasPurchaseSent(normalizedOrderId)) {
    if (isDev) {
      console.log('[gtag] trackPurchase skipped (already sent)', {
        orderId: normalizedOrderId,
        ...getPurchaseGuardDebug(normalizedOrderId),
      });
    }
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
  if (isDev) {
    console.log('[gtag] purchase pushed to dataLayer', {
      orderId: normalizedOrderId,
      transaction_id: transactionId,
      value,
      itemCount: ensuredItems.length,
    });
  }
}

/** Google Ads conversion dedupe (separate key from GA4 purchase). */
const GOOGLE_ADS_CONVERSION_SENT_PREFIX = 'google_ads_conversion_sent:';

function getGoogleAdsConversionStorageKey(orderId: string): string {
  return `${GOOGLE_ADS_CONVERSION_SENT_PREFIX}${normalizeOrderId(orderId)}`;
}

function wasGoogleAdsConversionSent(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = getGoogleAdsConversionStorageKey(orderId);
  return (
    hasStorageSentFlag(window.localStorage, key) ||
    hasStorageSentFlag(window.sessionStorage, key)
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
 * Fires at most once per orderId.
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
    console.info('[analytics] google_ads_purchase pushed to dataLayer', {
      orderId: normalizedOrderId,
      value: params.value,
      transactionId,
    });
  }
}
