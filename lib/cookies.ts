/**
 * Lightweight cookie helpers for internal traffic detection.
 * No external dependencies.
 */

const COOKIE_DAYS = 365;

/**
 * Set a first-party cookie.
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Optional: path, maxAge in days, secure, sameSite
 */
export function setCookie(
  name: string,
  value: string,
  options?: { path?: string; maxAgeDays?: number; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None' }
): void {
  if (typeof document === 'undefined') return;
  const path = options?.path ?? '/';
  const maxAgeDays = options?.maxAgeDays ?? COOKIE_DAYS;
  const secure = options?.secure ?? process.env.NODE_ENV === 'production';
  const sameSite = options?.sameSite ?? 'Lax';

  const expires = new Date();
  expires.setDate(expires.getDate() + maxAgeDays);
  const securePart = secure ? 'Secure; ' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires.toUTCString()}; Path=${path}; SameSite=${sameSite}; ${securePart}`.trim();
}

/**
 * Get a cookie value by name.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
