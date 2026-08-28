import { INTENT_STORAGE_KEY } from './config';
import {
  createInitialVisitorState,
  markAnalyticsFired,
  markCheckoutStarted,
  markPurchaseCompleted,
  recordProductView,
  touchSession,
  withCartHasItems,
} from './eligibility';
import type { DiscountAnalyticsEventName, VisitorState } from './types';
import { clearReferral, getStoredReferral, isIntentTenPercentCode } from '@/lib/referral';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseState(raw: unknown, now: number): VisitorState {
  const fallback = createInitialVisitorState(now);
  if (!isRecord(raw)) return fallback;

  const ids = Array.isArray(raw.viewed_product_ids)
    ? raw.viewed_product_ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  const knownEvents = new Set<DiscountAnalyticsEventName>([
    'discount_eligible',
    'discount_popup_shown',
    'discount_popup_closed',
    'discount_offer_activated',
    'discount_timer_expired',
    'discount_added_to_cart',
    'discount_checkout_started',
    'discount_purchase_completed',
  ]);
  const analytics = Array.isArray(raw.analytics_fired)
    ? raw.analytics_fired.filter(
        (name): name is DiscountAnalyticsEventName =>
          typeof name === 'string' && knownEvents.has(name as DiscountAnalyticsEventName)
      )
    : [];

  const visitorId =
    typeof raw.visitor_id === 'string' && raw.visitor_id.trim()
      ? raw.visitor_id.trim()
      : fallback.visitor_id;

  return {
    visitor_id: visitorId,
    first_visit_at: asNumber(raw.first_visit_at, now),
    last_visit_at: asNumber(raw.last_visit_at, now),
    visit_count: Math.max(1, Math.floor(asNumber(raw.visit_count, 1))),
    session_started_at: asNumber(raw.session_started_at, now),
    product_view_count: Math.max(0, Math.floor(asNumber(raw.product_view_count, 0))),
    viewed_product_ids: ids,
    cart_has_items: asBoolean(raw.cart_has_items, false),
    checkout_started: asBoolean(raw.checkout_started, false),
    purchase_completed: asBoolean(raw.purchase_completed, false),
    discount_offer_shown: asBoolean(raw.discount_offer_shown, false),
    discount_offer_started_at: asNullableNumber(raw.discount_offer_started_at),
    discount_offer_expires_at: asNullableNumber(raw.discount_offer_expires_at),
    discount_offer_used: asBoolean(raw.discount_offer_used, false),
    discount_offer_activated: asBoolean(raw.discount_offer_activated, false),
    pill_dismissed: asBoolean(raw.pill_dismissed, false),
    analytics_fired: analytics,
  };
}

export function readVisitorState(now: number = Date.now()): VisitorState {
  if (typeof window === 'undefined') return createInitialVisitorState(now);
  try {
    const raw = window.localStorage.getItem(INTENT_STORAGE_KEY);
    if (!raw) return createInitialVisitorState(now);
    return parseState(JSON.parse(raw) as unknown, now);
  } catch {
    return createInitialVisitorState(now);
  }
}

export function writeVisitorState(state: VisitorState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function loadAndTouchVisitorState(
  now: number = Date.now(),
  options: { documentVisible?: boolean } = {}
): VisitorState {
  const next = touchSession(readVisitorState(now), now, options);
  writeVisitorState(next);
  return next;
}

export function persistVisitorState(mutator: (state: VisitorState) => VisitorState): VisitorState {
  const now = Date.now();
  const next = mutator(readVisitorState(now));
  writeVisitorState(next);
  return next;
}

export function recordIntentProductView(productId: string, now: number = Date.now()): VisitorState {
  return persistVisitorState((state) => recordProductView(state, productId, now));
}

export function syncIntentCartHasItems(cartHasItems: boolean, now: number = Date.now()): VisitorState {
  return persistVisitorState((state) => withCartHasItems(state, cartHasItems, now));
}

export function markIntentCheckoutStarted(now: number = Date.now()): VisitorState {
  return persistVisitorState((state) => markCheckoutStarted(state, now));
}

export function markIntentPurchaseCompleted(
  usedOffer: boolean,
  now: number = Date.now()
): VisitorState {
  return persistVisitorState((state) => markPurchaseCompleted(state, usedOffer, now));
}

export function markIntentAnalyticsFired(event: DiscountAnalyticsEventName): VisitorState {
  return persistVisitorState((state) => markAnalyticsFired(state, event));
}

/** After confirmed payment: stop the offer on this device. Returns whether INTENT10 was on the order. */
export function completeIntentDiscountOnPurchase(now: number = Date.now()): boolean {
  const used = isIntentTenPercentCode(getStoredReferral()?.code);
  persistVisitorState((state) => markPurchaseCompleted(state, used, now));
  if (used) clearReferral();
  return used;
}
