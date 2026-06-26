import { readCookieConsent } from '@/lib/cookies/consent';

/** True when the visitor accepted analytics/marketing cookies via the consent banner. */
export function isAnalyticsAllowed(): boolean {
  return readCookieConsent() === 'accepted';
}
