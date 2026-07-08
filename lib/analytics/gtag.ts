import { isAnalyticsAllowed } from '@/lib/analytics/isAnalyticsAllowed';

/**
 * Analytics helpers — GTM dataLayer pushes only.
 *
 * Architecture: App → `window.dataLayer.push(...)` → GTM. No `gtag('event', …)` in app code.
 *
 * **Paid order (browser):** `OrderPageClient` calls `trackCheckoutPurchase` when `track_purchase=1`
 * (cart thank-you redirects here; pay-from-order Stripe success already lands here). Pushes **`purchase`**
 * with GA4 **`ecommerce`** (`transaction_id`, `value`, `currency`, `items`) and the **same** fields
 * mirrored at the **root** so GTM DL variables aligned with funnel events (`add_to_cart`, etc.) still work.
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

/** Server-side claim: order-level purchase dedupe (source of truth; localStorage is secondary). */
export interface PurchaseClaim {
  /** Public order token — the claim endpoint returns 404 without a valid one. */
  token: string;
}

type ClaimResult =
  | { shouldTrack: true }
  | { shouldTrack: false; reason: 'already_claimed' | 'not_paid' | 'error' };

/**
 * Ask the backend to claim purchase tracking for this order.
 * Atomic on the server — only the first caller globally gets `shouldTrack: true`.
 * Network/server errors fail closed (`error`) so the browser never pushes an unclaimed purchase.
 */
async function claimPurchaseTracking(orderId: string, token: string): Promise<ClaimResult> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/claim-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return { shouldTrack: false, reason: 'error' };
    const data = (await res.json().catch(() => null)) as {
      shouldTrack?: boolean;
      reason?: string;
    } | null;
    if (data?.shouldTrack === true) return { shouldTrack: true };
    const reason = data?.reason === 'not_paid' ? 'not_paid' : 'already_claimed';
    return { shouldTrack: false, reason };
  } catch {
    return { shouldTrack: false, reason: 'error' };
  }
}

/** Tell the server the browser purchase was pushed to dataLayer (sets ga4_purchase_sent). */
async function confirmPurchaseTracking(orderId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/confirm-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const CONFIRM_PURCHASE_RETRY_DELAYS_MS = [500, 2000, 5000] as const;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Await confirm-purchase with backoff so MP fallback does not fire while browser succeeded. */
async function confirmPurchaseTrackingWithRetries(orderId: string, token: string): Promise<boolean> {
  for (let attempt = 0; attempt <= CONFIRM_PURCHASE_RETRY_DELAYS_MS.length; attempt++) {
    if (await confirmPurchaseTracking(orderId, token)) {
      return true;
    }
    if (attempt < CONFIRM_PURCHASE_RETRY_DELAYS_MS.length) {
      await sleepMs(CONFIRM_PURCHASE_RETRY_DELAYS_MS[attempt]);
    }
  }
  console.warn('[analytics] confirm-purchase failed after retries', { orderId });
  return false;
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
 * Standard `purchase` after successful web checkout — **once per order id, globally**.
 *
 * Dedupe layers (in order):
 * 1. `claim` (when provided) — atomic server-side claim on the order row; the source of truth
 *    across browsers/devices. `shouldTrack: false` or claim failure → no push (fail closed).
 * 2. localStorage + in-memory guard — secondary browser-level protection (refresh-safe).
 *
 * Resolves `true` after GTM `eventCallback`, `false` on invalid input, duplicate, denied claim,
 * or push failure.
 */
export function trackCheckoutPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: PurchaseItem[];
  userData?: PurchaseUserData;
  claim?: PurchaseClaim;
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

      const doPush = () => {
        const claimToken = claim?.token?.trim();
        const afterPush = async () => {
          markCheckoutPurchaseSent(normalizedOrderId);
          if (claimToken) {
            await confirmPurchaseTrackingWithRetries(normalizedOrderId, claimToken);
          }
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
              void (async () => {
                if (isDev) {
                  console.info('[analytics] purchase pushed to dataLayer (eventCallback)', {
                    orderId: normalizedOrderId,
                    value,
                    itemCount: items.length,
                  });
                }
                await afterPush();
                finish(true);
              })();
            },
            eventTimeout: 5000,
          });

          window.setTimeout(() => {
            if (!settled) {
              void (async () => {
                if (isDev) {
                  console.warn('[analytics] purchase settled via eventTimeout (no eventCallback)', {
                    orderId: normalizedOrderId,
                  });
                }
                await afterPush();
                finish(true);
              })();
            }
          }, 5000);
        } catch (e) {
          if (isDev) console.error('[analytics] purchase push failed', e);
          finish(false);
        }
      };

      const claim = params.claim;
      if (!claim?.token?.trim()) {
        doPush();
        return;
      }

      // Claim as late as possible (GTM already confirmed loaded) and push immediately after,
      // so the window where a claim is consumed without a push is milliseconds.
      void claimPurchaseTracking(normalizedOrderId, claim.token.trim()).then((result) => {
        if (result.shouldTrack) {
          doPush();
          return;
        }
        if (result.reason === 'already_claimed') {
          // Tracked globally (another device/browser) — persist locally so this browser stops retrying.
          markCheckoutPurchaseSent(normalizedOrderId);
        }
        // 'not_paid' / 'error': no local flag, so a later legitimate attempt can still claim.
        if (isDev) {
          console.debug('[analytics] purchase skipped — claim denied', {
            orderId: normalizedOrderId,
            reason: result.reason,
          });
        }
        finish(false);
      });
    });
  });
}
