/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → window.dataLayer.push(...) → GTM → GA4.
 * The app NEVER calls gtag('event', ...) or loads gtag.js directly.
 * GTM is the single system responsible for sending browser events to GA4.
 *
 * GA4 ecommerce **purchase** (revenue) is sent server-side via Measurement Protocol
 * (`sendPurchaseForOrder`), not via dataLayer.
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

/** Dedupe key for optional GTM Google Ads conversion helper (unused unless you call `trackGoogleAdsPurchase`). */
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
 * Push google_ads_purchase to dataLayer for GTM → Google Ads Conversion tag (optional).
 * Fires at most once per orderId (dedupe via localStorage/sessionStorage).
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
