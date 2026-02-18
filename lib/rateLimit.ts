/**
 * Simple in-memory rate limiter. Resets on server restart.
 * Use for login protection (e.g. 5 attempts per IP per 15 min).
 */

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

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
