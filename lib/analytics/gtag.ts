/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → window.dataLayer.push(...) → GTM → GA4 / Ads.
 * The app NEVER calls gtag('event', ...) or loads gtag.js directly.
 *
 * **Paid order (browser):** `trackCheckoutPurchase` pushes **`google_ads_purchase`** only (GTM → Google Ads
 * and/or GA4 tags you configure). There is **no** dataLayer event named `purchase` from this module.
 * Dedupe: `google_ads_purchase_sent:*` per orderId (localStorage + sessionStorage).
 * Pushes are **deferred** until the GTM container is present (avoids Tag Assistant missing events that fire
 * before `gtm.js` finishes wiring the dataLayer).
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    /** Set by `googletagmanager.com/gtm.js` after the container loads. */
    google_tag_manager?: Record<string, unknown>;
  }
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/** Same ID as `components/GoogleAnalytics.tsx` (inlined at build time for client bundles). */
const GTM_CONTAINER_ID = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? '' : '';
const GTM_READY_POLL_MS = 50;
const GTM_READY_MAX_MS = 4000;

function isGtmContainerPresent(): boolean {
  if (typeof window === 'undefined' || !GTM_CONTAINER_ID) return false;
  const gtm = window.google_tag_manager;
  return Boolean(gtm && gtm[GTM_CONTAINER_ID] != null);
}

/**
 * Run after paint and once `window.google_tag_manager[GTM-…]` exists, or after a short timeout fallback.
 * Prevents conversion pushes from firing before GTM hooks the dataLayer (race with `afterInteractive` gtm.js).
 */
function runWhenGtmLikelyReady(run: () => void): void {
  if (typeof window === 'undefined') return;
  if (!GTM_CONTAINER_ID) {
    window.setTimeout(run, 0);
    return;
  }
  const start = Date.now();
  const raf =
    typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0);

  raf(() =>
    raf(() => {
      const tick = () => {
        if (isGtmContainerPresent() || Date.now() - start > GTM_READY_MAX_MS) {
          run();
          return;
        }
        window.setTimeout(tick, GTM_READY_POLL_MS);
      };
      window.setTimeout(tick, 0);
    }),
  );
}

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

/** Google Ads conversion dedupe (separate from server GA4 Measurement Protocol purchase). */
const GOOGLE_ADS_CONVERSION_SENT_PREFIX = 'google_ads_purchase_sent:';
const GTM_CALLBACK_TIMEOUT_MS = 3000;

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

  return new Promise((resolve) => {
    runWhenGtmLikelyReady(() => {
      if (wasGoogleAdsConversionSent(normalizedOrderId)) {
        if (isDev) {
          console.debug('[analytics] google_ads_purchase duplicate prevented (post-wait)', {
            orderId: normalizedOrderId,
          });
        }
        resolve();
        return;
      }
      markGoogleAdsConversionSent(normalizedOrderId);

      const items = params.items.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity ?? 1,
      }));

      void pushToDataLayerWithCallback('google_ads_purchase', {
        order_id: normalizedOrderId,
        /** Same as `order_id`; use in GTM for Google Ads / GA4 tags that expect `transaction_id`. */
        transaction_id: normalizedOrderId,
        value,
        currency,
        user_data: {
          email_address: normalizeEmail(params.email),
          phone_number: normalizeThaiPhoneNumber(params.phone),
        },
        ecommerce: {
          items,
        },
      }).then(() => {
        if (isDev) {
          console.info('[analytics] google_ads_purchase pushed to dataLayer', {
            orderId: normalizedOrderId,
            value,
            itemCount: items.length,
          });
        }
        resolve();
      });
    });
  });
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

  runWhenGtmLikelyReady(() => {
    if (wasGoogleAdsConversionSent(normalizedOrderId)) {
      if (isDev) {
        console.debug('[analytics] google_ads_purchase duplicate prevented (post-wait)', {
          orderId: normalizedOrderId,
        });
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
  });
}
