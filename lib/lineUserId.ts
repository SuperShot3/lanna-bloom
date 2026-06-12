/**
 * Checkout LINE user ID: plain profile ID text only (no URLs, no leading @).
 * Matches how `getLineUserContactUrl` builds `https://line.me/ti/p/~{id}`.
 */

const LINE_ID_LOOKS_LIKE_URL = /:\/\/|line\.me\/|lin\.ee\/|liff\.line|\.line\.scdn/i;

/** Letters, numbers, dot, underscore, hyphen — typical LINE user-set IDs. */
const LINE_USER_ID_CHARS = /^[A-Za-z0-9._-]{4,64}$/;

export function normalizeLineUserId(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\s/g, '');
}

/** Strips leading @ / spaces and disallowed characters; clears pasted links. */
export function sanitizeLineUserIdInput(raw: string): string {
  const slice = raw.slice(0, 64);
  if (LINE_ID_LOOKS_LIKE_URL.test(slice)) return '';
  let v = normalizeLineUserId(slice);
  v = v.replace(/[^A-Za-z0-9._-]/g, '');
  return v;
}

export function isValidLineUserId(normalized: string): boolean {
  if (!normalized || normalized.length > 64) return false;
  if (LINE_ID_LOOKS_LIKE_URL.test(normalized)) return false;
  if (/[\x00-\x1f<>"]/.test(normalized)) return false;
  return LINE_USER_ID_CHARS.test(normalized);
}
