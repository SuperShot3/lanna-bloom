/**
 * Client-side checkout submission token: paired with server-side idempotency on orders.submission_token.
 */

export const CHECKOUT_SUBMISSION_TOKEN_SESSION_KEY = 'lanna-bloom-checkout-submission-token';
export const CHECKOUT_COMPLETED_SUBMISSION_TOKEN_SESSION_KEY =
  'lanna-bloom-checkout-completed-submission-token';

export function validateSubmissionTokenFormat(value: string): boolean {
  const t = value.trim();
  if (t.length < 8 || t.length > 128) return false;
  return /^[0-9a-fA-F-]+$/.test(t);
}

export function readCheckoutTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('checkout_token');
  if (token && validateSubmissionTokenFormat(token)) return token.trim();
  return null;
}

export function markCheckoutSubmissionCompleted(token: string): void {
  if (typeof window === 'undefined') return;
  if (!validateSubmissionTokenFormat(token)) return;
  try {
    sessionStorage.setItem(CHECKOUT_COMPLETED_SUBMISSION_TOKEN_SESSION_KEY, token.trim());
  } catch {
    // ignore
  }
}

export function stripCheckoutTokenFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('checkout_token')) return;
  url.searchParams.delete('checkout_token');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}
