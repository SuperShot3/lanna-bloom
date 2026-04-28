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
const GOOGLE_ADS_CONVERSION_SENT_PREFIX = 'google_ads_purchase_sent:';
const GTM_CALLBACK_TIMEOUT_MS = 5000;

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

function normalizeEmail(email?: string | null): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : undefined;
}

export function normalizeThaiPhoneNumber(phone?: string | null): string | undefined {
  const cleaned = phone?.replace(/[^\d+]/g, '').trim();
  if (!cleaned) return undefined;
  if (cleaned.startsWith('+66')) return cleaned;
  if (cleaned.startsWith('66')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+66${cleaned.slice(1)}`;
  return cleaned.startsWith('+') ? cleaned : undefined;
}

function pushToDataLayerWithCallback(eventName: string, params: Record<string, unknown>): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  window.dataLayer = window.dataLayer || [];

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    window.setTimeout(finish, GTM_CALLBACK_TIMEOUT_MS);
    window.dataLayer!.push({
      event: eventName,
      ...params,
      eventCallback: finish,
      eventTimeout: GTM_CALLBACK_TIMEOUT_MS,
    });
  });
}

export function trackCheckoutPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  email?: string | null;
  phone?: string | null;
  items: PurchaseItem[];
}): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const normalizedOrderId = normalizeOrderId(params.orderId);
  const value = Number(params.value);
  const currency = params.currency ?? 'THB';
  if (!normalizedOrderId || !Number.isFinite(value) || value <= 0 || params.items.length === 0) {
    return Promise.resolve();
  }

  if (wasGoogleAdsConversionSent(normalizedOrderId)) {
    if (isDev) {
      console.debug('[analytics] google_ads_purchase duplicate prevented', { orderId: normalizedOrderId });
    }
    return Promise.resolve();
  }
  markGoogleAdsConversionSent(normalizedOrderId);

  const items = params.items.map((item) => ({
    item_id: item.item_id,
    item_name: item.item_name,
    price: item.price,
    quantity: item.quantity ?? 1,
  }));

  const pushed = pushToDataLayerWithCallback('google_ads_purchase', {
    order_id: normalizedOrderId,
    value,
    currency,
    user_data: {
      email_address: normalizeEmail(params.email),
      phone_number: normalizeThaiPhoneNumber(params.phone),
    },
    ecommerce: {
      items,
    },
  });

  if (isDev) {
    console.info('[analytics] google_ads_purchase pushed to dataLayer', {
      orderId: normalizedOrderId,
      value,
      itemCount: items.length,
    });
  }

  return pushed;
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
