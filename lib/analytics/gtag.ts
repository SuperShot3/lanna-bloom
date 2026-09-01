import { isAnalyticsAllowed } from '@/lib/analytics/isAnalyticsAllowed';

/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → `window.dataLayer.push(...)` → GTM. No `gtag('event', …)` in app code.
 *
 * **Paid order (browser):** `OrderThankYouClient` (primary) and `OrderPageClient` (fallback)
 * call `trackCheckoutPurchase`, which pushes **`purchase`** with GA4 **`ecommerce`**
 * (`transaction_id`, `value`, `currency`, `items`) and the **same** fields mirrored at the
 * **root** so GTM DL variables aligned with funnel events (`add_to_cart`, etc.) still work.
 *
 * Dedupe is browser-only (`localStorage` + in-memory). Server claim/confirm and Measurement
 * Protocol are not on the hot path.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    /** Set by `GoogleAnalytics` inline script immediately after `gtag('consent', 'default', …)`. */
    __lannaConsentDefaultsApplied?: boolean;
    google_tag_manager?: Record<string, unknown>;
  }
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/**
 * Safe helper for pushing events to the GTM dataLayer.
 * Every analytics event in the app MUST go through this function.
 */
export function pushToDataLayer(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsAllowed()) return;
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

/** Checkout: customer confirmed a Google Places delivery location. */
export function trackDeliveryAddressSelected(params: {
  placeId: string;
  lat?: number;
  lng?: number;
  province?: string | null;
}): void {
  const lat = params.lat;
  const lng = params.lng;
  pushToDataLayer('delivery_address_selected', {
    place_id: params.placeId,
    has_lat_lng: typeof lat === 'number' && typeof lng === 'number',
    province: params.province ?? undefined,
    source: 'checkout',
  });
}

function normalizeOrderId(orderId: string): string {
  return typeof orderId === 'string' ? orderId.trim() : '';
}

/** Coerce analytics money fields to a finite number (handles DB/JSON strings; strips thousands separators). */
function toAnalyticsNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/,/g, '').trim();
    if (!cleaned) return NaN;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  if (raw == null) return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/** Same-tab guard so a re-running effect cannot double-push before localStorage updates. */
const purchaseSentThisDocument = new Set<string>();

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
const LANA_PURCHASE_FIRED_PREFIX = 'lanna_purchase_fired_';
/** Legacy key — still read so deploy does not double-fire on refresh. */
const LEGACY_SENT_PURCHASE_PREFIX = 'sent_purchase_';

function getPurchaseStorageKey(orderId: string): string {
  return `${LANA_PURCHASE_FIRED_PREFIX}${normalizeOrderId(orderId)}`;
}

function getLegacyPurchaseStorageKey(orderId: string): string {
  return `${LEGACY_SENT_PURCHASE_PREFIX}${normalizeOrderId(orderId)}`;
}

function wasPurchaseSentInStorage(orderId: string): boolean {
  if (typeof window === 'undefined') return true;
  const storage = window.localStorage;
  return (
    hasStorageSentFlag(storage, getPurchaseStorageKey(orderId)) ||
    hasStorageSentFlag(storage, getLegacyPurchaseStorageKey(orderId))
  );
}

function markPurchaseSentInStorage(orderId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getPurchaseStorageKey(orderId), '1');
  } catch {
    // ignore
  }
}

export interface PurchaseUserData {
  email_address?: string;
  phone_number?: string;
}

/** Whether checkout purchase was already sent for this order (localStorage + same-document guard). */
export function wasCheckoutPurchaseSent(orderId: string): boolean {
  const normalizedOrderId = normalizeOrderId(orderId);
  if (!normalizedOrderId) return false;
  return wasPurchaseSentInStorage(normalizedOrderId) || purchaseSentThisDocument.has(normalizedOrderId);
}

/** Mark checkout purchase as sent without pushing (rare; prefer successful push via trackCheckoutPurchase). */
export function markCheckoutPurchaseSent(orderId: string): void {
  const normalizedOrderId = normalizeOrderId(orderId);
  if (!normalizedOrderId) return;
  purchaseSentThisDocument.add(normalizedOrderId);
  markPurchaseSentInStorage(normalizedOrderId);
}

function readNonNegativeIntEnv(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[name] : undefined;
  const n = raw != null && String(raw).trim() !== '' ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function isGtmContainerBootstrapped(containerId: string | undefined): boolean {
  if (!containerId || typeof window === 'undefined') return false;
  const gtm = window.google_tag_manager;
  return Boolean(gtm && typeof gtm === 'object' && Object.prototype.hasOwnProperty.call(gtm, containerId));
}

/**
 * Wait until GTM’s container object exists (or poll budget elapses), then wait an extra fixed delay
 * before running `purchase` pushes — reduces consent-vs-GTM ordering issues with ad_storage defaults.
 */
function waitForGtmConsentThen(onReady: () => void): void {
  if (typeof window === 'undefined') return;

  const gtmId = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GTM_ID?.trim() : '';
  const deferMs = readNonNegativeIntEnv('NEXT_PUBLIC_ANALYTICS_PURCHASE_DEFER_MS', 120);
  const pollMaxMs = readNonNegativeIntEnv('NEXT_PUBLIC_ANALYTICS_PURCHASE_GTM_POLL_MAX_MS', 2500);
  const pollEveryMs = readNonNegativeIntEnv('NEXT_PUBLIC_ANALYTICS_PURCHASE_GTM_POLL_INTERVAL_MS', 50);

  const startedAt = Date.now();

  const scheduleFinal = () => {
    window.setTimeout(onReady, deferMs);
  };

  const poll = () => {
    if (!gtmId || isGtmContainerBootstrapped(gtmId)) {
      scheduleFinal();
      return;
    }
    if (Date.now() - startedAt >= pollMaxMs) {
      scheduleFinal();
      return;
    }
    window.setTimeout(poll, pollEveryMs);
  };

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => poll());
  } else {
    poll();
  }
}

/**
 * Standard `purchase` after successful web checkout — **once per order id** (browser dedupe).
 *
 * Resolves `true` after GTM `eventCallback` / timeout, `false` on invalid input, duplicate, or push failure.
 * Does not call claim/confirm APIs — GTM is the transport; localStorage prevents refresh double-fire.
 */
export function trackCheckoutPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: PurchaseItem[];
  userData?: PurchaseUserData;
}): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!isAnalyticsAllowed()) return Promise.resolve(false);

  const normalizedOrderId = normalizeOrderId(params.orderId);
  const value = toAnalyticsNumber(params.value);
  const currency = (params.currency ?? 'THB').trim() || 'THB';

  if (!normalizedOrderId || !Number.isFinite(value) || value <= 0) {
    if (isDev) {
      console.warn('[analytics] purchase skipped — invalid order id or value', {
        orderId: normalizedOrderId,
        rawValue: params.value,
        value,
      });
    }
    return Promise.resolve(false);
  }

  let itemsInput = params.items;
  if (itemsInput.length === 0 && value > 0) {
    itemsInput = [
      {
        item_id: normalizedOrderId,
        item_name: 'Purchase',
        price: value,
        quantity: 1,
        index: 0,
      },
    ];
  }
  if (itemsInput.length === 0) {
    return Promise.resolve(false);
  }

  if (wasCheckoutPurchaseSent(normalizedOrderId)) {
    if (isDev) {
      console.debug('[analytics] purchase duplicate prevented', { orderId: normalizedOrderId });
    }
    return Promise.resolve(false);
  }

  const items = itemsInput.map((item, idx) => {
    const price = toAnalyticsNumber(item.price);
    const quantity = Math.max(1, Math.floor(toAnalyticsNumber(item.quantity ?? 1)) || 1);
    return {
      item_id: String(item.item_id ?? '').trim() || `line_${idx}`,
      item_name: String(item.item_name ?? '').trim() || 'Item',
      price,
      quantity,
      ...(typeof item.index === 'number' && Number.isFinite(item.index) ? { index: item.index } : { index: idx }),
      ...(item.item_category ? { item_category: item.item_category } : {}),
      ...(item.item_variant ? { item_variant: item.item_variant } : {}),
      ...(item.currency ? { currency: item.currency } : {}),
    };
  });

  const invalidLine = items.find((it) => !Number.isFinite(it.price) || it.price < 0);
  if (invalidLine) {
    if (isDev) {
      console.warn('[analytics] purchase skipped — invalid item price', { orderId: normalizedOrderId, invalidLine });
    }
    return Promise.resolve(false);
  }

  const ecommerce = {
    transaction_id: normalizedOrderId,
    value,
    currency,
    items,
  };

  const userData: PurchaseUserData = {};
  const email = params.userData?.email_address?.trim();
  const phone = params.userData?.phone_number?.trim();
  if (email) userData.email_address = email;
  if (phone) userData.phone_number = phone;
  const hasUserData = Boolean(userData.email_address || userData.phone_number);

  return new Promise<boolean>((resolve) => {
    waitForGtmConsentThen(() => {
      if (wasCheckoutPurchaseSent(normalizedOrderId)) {
        resolve(false);
        return;
      }

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ ecommerce: null });

        window.dataLayer.push({
          event: 'purchase',
          ecommerce,
          transaction_id: normalizedOrderId,
          value,
          currency,
          items,
          ...(hasUserData ? { user_data: userData } : {}),
          eventCallback: () => {
            if (isDev) {
              console.info('[analytics] purchase pushed to dataLayer (eventCallback)', {
                orderId: normalizedOrderId,
                value,
                itemCount: items.length,
              });
            }
            markCheckoutPurchaseSent(normalizedOrderId);
            finish(true);
          },
          eventTimeout: 5000,
        });

        window.setTimeout(() => {
          if (!settled) {
            if (isDev) {
              console.warn('[analytics] purchase settled via eventTimeout (no eventCallback)', {
                orderId: normalizedOrderId,
              });
            }
            markCheckoutPurchaseSent(normalizedOrderId);
            finish(true);
          }
        }, 5000);
      } catch (e) {
        if (isDev) console.error('[analytics] purchase push failed', e);
        finish(false);
      }
    });
  });
}
