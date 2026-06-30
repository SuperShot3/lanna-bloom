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
