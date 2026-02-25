/**
 * Simple in-memory rate limiter. Resets on server restart.
 * Use for login protection (e.g. 5 attempts per IP per 15 min).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const orderLookupStore = new Map<string, { count: number; resetAt: number }>();
const ORDER_LOOKUP_WINDOW_MS = 60 * 1000; // 1 minute
const ORDER_LOOKUP_MAX = 10;

export function checkOrderLookupRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = orderLookupStore.get(ip);
  if (!entry) {
    orderLookupStore.set(ip, { count: 1, resetAt: now + ORDER_LOOKUP_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    orderLookupStore.set(ip, { count: 1, resetAt: now + ORDER_LOOKUP_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= ORDER_LOOKUP_MAX;
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
