import { getCookie, setCookie } from '@/lib/cookies';

export const COOKIE_CONSENT_NAME = 'cookie_consent';

export type CookieConsentValue = 'accepted' | 'rejected';

export function readCookieConsent(): CookieConsentValue | null {
  const raw = getCookie(COOKIE_CONSENT_NAME);
  if (raw === 'accepted' || raw === 'rejected') return raw;
  return null;
}

export function setCookieConsent(value: CookieConsentValue): void {
  setCookie(COOKIE_CONSENT_NAME, value, {
    path: '/',
    maxAgeDays: 365,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });
}
