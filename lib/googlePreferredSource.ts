/**
 * Canonical publication hostname for Google Preferred Sources.
 * Use the exact host readers see in Search / Search Console (www, not apex).
 */
export const GOOGLE_PREFERRED_SOURCE_HOSTNAME = 'www.lannabloom.shop';

/** Deeplink to Google's source preferences tool for this publication. */
export function getGooglePreferredSourceDeeplink(
  hostname: string = GOOGLE_PREFERRED_SOURCE_HOSTNAME
): string {
  return `https://www.google.com/preferences/source?q=${encodeURIComponent(hostname)}`;
}

/** @deprecated Use GOOGLE_PREFERRED_SOURCE_HOSTNAME */
export const GOOGLE_PREFERRED_SOURCE_QUERY = GOOGLE_PREFERRED_SOURCE_HOSTNAME;

/** @deprecated Use getGooglePreferredSourceDeeplink() */
export const GOOGLE_PREFERRED_SOURCE_DEEPLINK = getGooglePreferredSourceDeeplink();
