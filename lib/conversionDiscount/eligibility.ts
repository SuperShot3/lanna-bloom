import {
  INTENT_MIN_SESSION_MS,
  INTENT_MIN_UNIQUE_PRODUCT_VIEWS,
  INTENT_OFFER_DURATION_MS,
  INTENT_SESSION_IDLE_MS,
  INTENT_VIEWED_PRODUCT_IDS_CAP,
} from './config';
import type { IntentRule, VisitorState, VisitorType } from './types';

export function createVisitorId(now: number = Date.now()): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lb_${now.toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function createInitialVisitorState(now: number = Date.now()): VisitorState {
  return {
    visitor_id: createVisitorId(now),
    first_visit_at: now,
    last_visit_at: now,
    visit_count: 1,
    session_started_at: now,
    product_view_count: 0,
    viewed_product_ids: [],
    cart_has_items: false,
    checkout_started: false,
    purchase_completed: false,
    discount_offer_shown: false,
    discount_offer_started_at: null,
    discount_offer_expires_at: null,
    discount_offer_used: false,
    discount_offer_activated: false,
    pill_dismissed: false,
    analytics_fired: [],
  };
}

export function visitorType(state: VisitorState): VisitorType {
  return state.visit_count <= 1 ? 'new' : 'returning';
}

export function isOfferActive(state: VisitorState, now: number): boolean {
  if (state.purchase_completed || state.discount_offer_used) return false;
  const expires = state.discount_offer_expires_at;
  if (expires == null || state.discount_offer_started_at == null) return false;
  return now < expires;
}

export function isOfferExpiredUnused(state: VisitorState, now: number): boolean {
  if (state.purchase_completed || state.discount_offer_used) return false;
  const expires = state.discount_offer_expires_at;
  if (expires == null) return false;
  return now >= expires;
}

export function remainingOfferMs(state: VisitorState, now: number): number {
  if (!isOfferActive(state, now) || state.discount_offer_expires_at == null) return 0;
  return Math.max(0, state.discount_offer_expires_at - now);
}

export const sessionAgeAtLeast =
  (minMs: number): IntentRule =>
  (state, now) =>
    now - state.session_started_at >= minMs;

export const uniqueProductViewsAtLeast =
  (minViews: number): IntentRule =>
  (state) =>
    state.viewed_product_ids.length >= minViews;

/** v1: 60s active session AND 2+ unique product pages. */
export const DEFAULT_INTENT_RULES: IntentRule[] = [
  (state, now) =>
    sessionAgeAtLeast(INTENT_MIN_SESSION_MS)(state, now) &&
    uniqueProductViewsAtLeast(INTENT_MIN_UNIQUE_PRODUCT_VIEWS)(state, now),
];

export function isHighIntent(
  state: VisitorState,
  now: number,
  rules: IntentRule[] = DEFAULT_INTENT_RULES
): boolean {
  if (rules.length === 0) return false;
  return rules.some((rule) => rule(state, now));
}

/**
 * A later session may qualify again after an unused window expires.
 * Same session after expiry: do not start another window.
 * After purchase: never.
 */
export function canStartOffer(state: VisitorState, now: number): boolean {
  if (state.purchase_completed || state.discount_offer_used) return false;
  if (isOfferActive(state, now)) return false;
  if (state.discount_offer_expires_at == null) return true;
  if (now < state.discount_offer_expires_at) return false;
  return state.session_started_at >= state.discount_offer_expires_at;
}

export function startOffer(state: VisitorState, now: number): VisitorState {
  return {
    ...state,
    last_visit_at: now,
    discount_offer_started_at: now,
    discount_offer_expires_at: now + INTENT_OFFER_DURATION_MS,
    discount_offer_shown: false,
    discount_offer_activated: false,
    discount_offer_used: false,
    pill_dismissed: false,
    analytics_fired: [],
  };
}

export function shouldShowPopup(state: VisitorState, now: number): boolean {
  if (!isOfferActive(state, now)) return false;
  if (state.discount_offer_shown) return false;
  if (state.purchase_completed) return false;
  if (state.cart_has_items) return false;
  return true;
}

/** Soft abandoned-cart copy only when the same unexpired window is still live. */
export function shouldUseAbandonedCartCopy(state: VisitorState, now: number): boolean {
  return (
    isOfferActive(state, now) &&
    state.cart_has_items &&
    !state.purchase_completed &&
    state.visit_count > 1
  );
}

function resetOfferFields(state: VisitorState): VisitorState {
  return {
    ...state,
    discount_offer_shown: false,
    discount_offer_started_at: null,
    discount_offer_expires_at: null,
    discount_offer_activated: false,
    pill_dismissed: false,
    analytics_fired: [],
  };
}

export function touchSession(
  state: VisitorState,
  now: number,
  options: { documentVisible?: boolean } = {}
): VisitorState {
  const visible = options.documentVisible !== false;
  const idle = now - state.last_visit_at;
  const isNewSession = idle >= INTENT_SESSION_IDLE_MS;

  let next: VisitorState = {
    ...state,
    last_visit_at: visible ? now : state.last_visit_at,
  };

  if (isNewSession) {
    next = {
      ...next,
      visit_count: state.visit_count + 1,
      session_started_at: now,
      last_visit_at: now,
      checkout_started: false,
    };
    if (!next.purchase_completed && !next.discount_offer_used && !isOfferActive(state, now)) {
      next = resetOfferFields(next);
    }
  }

  return next;
}

export function recordProductView(state: VisitorState, productId: string, now: number): VisitorState {
  const id = productId.trim();
  if (!id) return touchSession(state, now);
  const existing = state.viewed_product_ids;
  if (existing.includes(id)) {
    return {
      ...touchSession(state, now),
      product_view_count: state.product_view_count + 1,
    };
  }
  const viewed_product_ids = [...existing, id].slice(-INTENT_VIEWED_PRODUCT_IDS_CAP);
  return {
    ...touchSession(state, now),
    viewed_product_ids,
    product_view_count: state.product_view_count + 1,
  };
}

export function withCartHasItems(state: VisitorState, cartHasItems: boolean, now: number): VisitorState {
  return { ...touchSession(state, now), cart_has_items: cartHasItems };
}

export function markOfferShown(state: VisitorState): VisitorState {
  return { ...state, discount_offer_shown: true };
}

export function markOfferActivated(state: VisitorState): VisitorState {
  return { ...state, discount_offer_activated: true, discount_offer_shown: true };
}

export function markPillDismissed(state: VisitorState): VisitorState {
  return { ...state, pill_dismissed: true };
}

export function markCheckoutStarted(state: VisitorState, now: number): VisitorState {
  return { ...touchSession(state, now), checkout_started: true };
}

export function markPurchaseCompleted(state: VisitorState, usedOffer: boolean, now: number): VisitorState {
  return {
    ...touchSession(state, now),
    purchase_completed: true,
    discount_offer_used: usedOffer || state.discount_offer_used,
    cart_has_items: false,
    pill_dismissed: true,
  };
}

export function markAnalyticsFired(
  state: VisitorState,
  event: VisitorState['analytics_fired'][number]
): VisitorState {
  if (state.analytics_fired.includes(event)) return state;
  return { ...state, analytics_fired: [...state.analytics_fired, event] };
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
