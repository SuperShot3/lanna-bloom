/**
 * Simple in-memory rate limiter. Resets on server restart.
 * Use for login protection (e.g. 5 attempts per IP per 15 min).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const orderLookupStore = new Map<string, { count: number; resetAt: number }>();
const ORDER_LOOKUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const ORDER_LOOKUP_MAX = 6;

const notifyAdminStore = new Map<string, { count: number; resetAt: number }>();
const NOTIFY_ADMIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const NOTIFY_ADMIN_MAX = 5;

const stripeOrderStatusStore = new Map<string, { count: number; resetAt: number }>();
const STRIPE_ORDER_STATUS_WINDOW_MS = 60 * 1000; // 1 minute
const STRIPE_ORDER_STATUS_MAX = 30;

const payLinkCheckoutStore = new Map<string, { count: number; resetAt: number }>();
const PAY_LINK_CHECKOUT_WINDOW_MS = 60 * 1000; // 1 minute
const PAY_LINK_CHECKOUT_MAX = 20;

const sharedCartCreateStore = new Map<string, { count: number; resetAt: number }>();
const SHARED_CART_CREATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const SHARED_CART_CREATE_MAX = 10;

const sharedCartReadStore = new Map<string, { count: number; resetAt: number }>();
const SHARED_CART_READ_WINDOW_MS = 60 * 1000; // 1 minute
const SHARED_CART_READ_MAX = 30;

const checkoutRecoveryReadStore = new Map<string, { count: number; resetAt: number }>();
const CHECKOUT_RECOVERY_READ_WINDOW_MS = 60 * 1000; // 1 minute
const CHECKOUT_RECOVERY_READ_MAX = 30;

const deliveryLocationRequestStore = new Map<string, { count: number; resetAt: number }>();
const DELIVERY_LOCATION_REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DELIVERY_LOCATION_REQUEST_MAX = 5;

const guideCommentSubmitStore = new Map<string, { count: number; resetAt: number }>();
const GUIDE_COMMENT_SUBMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const GUIDE_COMMENT_SUBMIT_MAX = 5;

const guideCommentLikeStore = new Map<string, { count: number; resetAt: number }>();
const GUIDE_COMMENT_LIKE_WINDOW_MS = 60 * 1000; // 1 minute
const GUIDE_COMMENT_LIKE_MAX = 30;

const guideCommentReadStore = new Map<string, { count: number; resetAt: number }>();
const GUIDE_COMMENT_READ_WINDOW_MS = 60 * 1000; // 1 minute
const GUIDE_COMMENT_READ_MAX = 60;

const guideCommentVisitorCooldownStore = new Map<string, number>();
const GUIDE_COMMENT_VISITOR_COOLDOWN_MS = 60 * 1000; // 1 minute

const orderChatPostStore = new Map<string, { count: number; resetAt: number }>();
const ORDER_CHAT_POST_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const ORDER_CHAT_POST_MAX = 20;

const attributionTouchStore = new Map<string, { count: number; resetAt: number }>();
const ATTRIBUTION_TOUCH_WINDOW_MS = 60 * 1000; // 1 minute
const ATTRIBUTION_TOUCH_MAX = 40;

/** Admin login: wrong password attempts per email (in-memory; resets on server restart). */
const ADMIN_PASSWORD_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ADMIN_PASSWORD_MAX_FAILURES = 5;
const ADMIN_PASSWORD_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes from lock trigger

type AdminPasswordEntry = { failures: number[]; lockoutUntil: number | null };
const adminPasswordStore = new Map<string, AdminPasswordEntry>();

function pruneAdminFailures(failures: number[]): number[] {
  const cutoff = Date.now() - ADMIN_PASSWORD_WINDOW_MS;
  return failures.filter((t) => t > cutoff);
}

export function isAdminPasswordLockedOut(email: string): boolean {
  const key = email.trim().toLowerCase();
  const entry = adminPasswordStore.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.lockoutUntil && now < entry.lockoutUntil) return true;
  if (entry.lockoutUntil && now >= entry.lockoutUntil) {
    entry.lockoutUntil = null;
    entry.failures = pruneAdminFailures(entry.failures);
  }
  return false;
}

export function recordAdminPasswordFailure(email: string): void {
  const key = email.trim().toLowerCase();
  let entry = adminPasswordStore.get(key);
  if (!entry) {
    entry = { failures: [], lockoutUntil: null };
    adminPasswordStore.set(key, entry);
  }
  if (entry.lockoutUntil && Date.now() < entry.lockoutUntil) return;

  const now = Date.now();
  entry.failures = pruneAdminFailures(entry.failures);
  entry.failures.push(now);
  if (entry.failures.length >= ADMIN_PASSWORD_MAX_FAILURES) {
    entry.lockoutUntil = now + ADMIN_PASSWORD_LOCKOUT_MS;
  }
}

export function clearAdminPasswordFailures(email: string): void {
  adminPasswordStore.delete(email.trim().toLowerCase());
}

export function checkOrderLookupRateLimit(ip: string, scope = 'default'): boolean {
  const now = Date.now();
  const key = `${ip}:${scope}`;
  const entry = orderLookupStore.get(key);
  if (!entry) {
    orderLookupStore.set(key, { count: 1, resetAt: now + ORDER_LOOKUP_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    orderLookupStore.set(key, { count: 1, resetAt: now + ORDER_LOOKUP_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= ORDER_LOOKUP_MAX;
}

export function checkNotifyAdminRateLimit(ip: string, orderId: string): boolean {
  const now = Date.now();
  const key = `${ip}:${orderId}`;
  const entry = notifyAdminStore.get(key);
  if (!entry) {
    notifyAdminStore.set(key, { count: 1, resetAt: now + NOTIFY_ADMIN_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    notifyAdminStore.set(key, { count: 1, resetAt: now + NOTIFY_ADMIN_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= NOTIFY_ADMIN_MAX;
}

export function checkSharedCartCreateRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `create:${ip}`;
  const entry = sharedCartCreateStore.get(key);
  if (!entry) {
    sharedCartCreateStore.set(key, { count: 1, resetAt: now + SHARED_CART_CREATE_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    sharedCartCreateStore.set(key, { count: 1, resetAt: now + SHARED_CART_CREATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= SHARED_CART_CREATE_MAX;
}

export function checkCheckoutRecoveryReadRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `recover:${ip}`;
  const entry = checkoutRecoveryReadStore.get(key);
  if (!entry) {
    checkoutRecoveryReadStore.set(key, {
      count: 1,
      resetAt: now + CHECKOUT_RECOVERY_READ_WINDOW_MS,
    });
    return true;
  }
  if (now > entry.resetAt) {
    checkoutRecoveryReadStore.set(key, {
      count: 1,
      resetAt: now + CHECKOUT_RECOVERY_READ_WINDOW_MS,
    });
    return true;
  }
  entry.count++;
  return entry.count <= CHECKOUT_RECOVERY_READ_MAX;
}

export function checkSharedCartReadRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `read:${ip}`;
  const entry = sharedCartReadStore.get(key);
  if (!entry) {
    sharedCartReadStore.set(key, { count: 1, resetAt: now + SHARED_CART_READ_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    sharedCartReadStore.set(key, { count: 1, resetAt: now + SHARED_CART_READ_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= SHARED_CART_READ_MAX;
}

export function checkDeliveryLocationRequestRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `dlr:${ip}`;
  const entry = deliveryLocationRequestStore.get(key);
  if (!entry) {
    deliveryLocationRequestStore.set(key, {
      count: 1,
      resetAt: now + DELIVERY_LOCATION_REQUEST_WINDOW_MS,
    });
    return true;
  }
  if (now > entry.resetAt) {
    deliveryLocationRequestStore.set(key, {
      count: 1,
      resetAt: now + DELIVERY_LOCATION_REQUEST_WINDOW_MS,
    });
    return true;
  }
  entry.count++;
  return entry.count <= DELIVERY_LOCATION_REQUEST_MAX;
}

export function checkStripeOrderStatusRateLimit(ip: string, sessionId: string): boolean {
  const now = Date.now();
  const sid = sessionId.trim();
  const key = `${ip}:${sid}`;
  const entry = stripeOrderStatusStore.get(key);
  if (!entry) {
    stripeOrderStatusStore.set(key, { count: 1, resetAt: now + STRIPE_ORDER_STATUS_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    stripeOrderStatusStore.set(key, { count: 1, resetAt: now + STRIPE_ORDER_STATUS_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= STRIPE_ORDER_STATUS_MAX;
}

/** Public pay-link Pay now: per IP + draft/order id. */
export function checkPayLinkCheckoutRateLimit(ip: string, linkId: string): boolean {
  const now = Date.now();
  const key = `${ip}:${linkId.trim()}`;
  const entry = payLinkCheckoutStore.get(key);
  if (!entry) {
    payLinkCheckoutStore.set(key, { count: 1, resetAt: now + PAY_LINK_CHECKOUT_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    payLinkCheckoutStore.set(key, { count: 1, resetAt: now + PAY_LINK_CHECKOUT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= PAY_LINK_CHECKOUT_MAX;
}

export function checkGuideCommentSubmitRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `gcs:${ip}`;
  const entry = guideCommentSubmitStore.get(key);
  if (!entry) {
    guideCommentSubmitStore.set(key, { count: 1, resetAt: now + GUIDE_COMMENT_SUBMIT_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    guideCommentSubmitStore.set(key, { count: 1, resetAt: now + GUIDE_COMMENT_SUBMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= GUIDE_COMMENT_SUBMIT_MAX;
}

export function checkGuideCommentLikeRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `gcl:${ip}`;
  const entry = guideCommentLikeStore.get(key);
  if (!entry) {
    guideCommentLikeStore.set(key, { count: 1, resetAt: now + GUIDE_COMMENT_LIKE_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    guideCommentLikeStore.set(key, { count: 1, resetAt: now + GUIDE_COMMENT_LIKE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= GUIDE_COMMENT_LIKE_MAX;
}

export function checkGuideCommentReadRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `gcr:${ip}`;
  const entry = guideCommentReadStore.get(key);
  if (!entry) {
    guideCommentReadStore.set(key, { count: 1, resetAt: now + GUIDE_COMMENT_READ_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    guideCommentReadStore.set(key, { count: 1, resetAt: now + GUIDE_COMMENT_READ_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= GUIDE_COMMENT_READ_MAX;
}

export function checkGuideCommentVisitorCooldown(visitorTokenHash: string): boolean {
  const now = Date.now();
  const key = visitorTokenHash.trim();
  if (!key) return false;
  const lastAt = guideCommentVisitorCooldownStore.get(key);
  if (lastAt != null && now - lastAt < GUIDE_COMMENT_VISITOR_COOLDOWN_MS) {
    return false;
  }
  guideCommentVisitorCooldownStore.set(key, now);
  return true;
}

/** First-party attribution touch: per IP. */
export function checkAttributionTouchRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = attributionTouchStore.get(key);
  if (!entry) {
    attributionTouchStore.set(key, { count: 1, resetAt: now + ATTRIBUTION_TOUCH_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    attributionTouchStore.set(key, { count: 1, resetAt: now + ATTRIBUTION_TOUCH_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= ATTRIBUTION_TOUCH_MAX;
}

/** Customer order chat POST: per IP + orderId. */
export function checkOrderChatPostRateLimit(ip: string, orderId: string): boolean {
  const now = Date.now();
  const key = `${ip}:${orderId}`;
  const entry = orderChatPostStore.get(key);
  if (!entry) {
    orderChatPostStore.set(key, { count: 1, resetAt: now + ORDER_CHAT_POST_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    orderChatPostStore.set(key, { count: 1, resetAt: now + ORDER_CHAT_POST_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= ORDER_CHAT_POST_MAX;
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  return {
    allowed: entry.count <= MAX_ATTEMPTS,
    remaining,
  };
}
