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

/**
 * LINE ID derived from the sender phone already entered at checkout.
 * Thai (+66) numbers skip the leading 0 in the national field; LINE search
 * typically uses the local form with 0 (e.g. 812345678 → 0812345678).
 */
export function lineIdFromPhone(countryCode: string, phoneNational: string): string {
  const digits = phoneNational.replace(/\D/g, '');
  if (!digits) return '';
  const callingCode = countryCode.replace(/\D/g, '');
  const withThaiZero =
    callingCode === '66' && !digits.startsWith('0') ? `0${digits}` : digits;
  return sanitizeLineUserIdInput(withThaiZero);
}

export function effectiveCheckoutLineId(params: {
  useLineIdFromPhone: boolean;
  lineId: string;
  countryCode: string;
  phoneNational: string;
}): string {
  if (params.useLineIdFromPhone) {
    return lineIdFromPhone(params.countryCode, params.phoneNational);
  }
  return params.lineId;
}

export function lineIdMatchesPhone(
  lineId: string,
  countryCode: string,
  phoneNational: string
): boolean {
  const derived = lineIdFromPhone(countryCode, phoneNational);
  if (!derived) return false;
  return normalizeLineUserId(lineId) === derived;
}
