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
