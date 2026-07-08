/**
 * Read GA4 / Google Ads identifiers from the browser for server-side purchase fallback.
 * Safe to call only on the client before checkout.
 */

const AD_CLICK_STORAGE_KEY = 'lanna_ad_click_ids';
const AD_CLICK_COOKIE_GCLID = 'lanna_ad_gclid';
const AD_CLICK_COOKIE_GBRAID = 'lanna_ad_gbraid';
const AD_CLICK_COOKIE_WBRAID = 'lanna_ad_wbraid';
const AD_CLICK_COOKIE_MAX_AGE_DAYS = 90;

export interface CheckoutAnalyticsContext {
  ga_client_id?: string;
  ga_session_id?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const maxAgeSec = AD_CLICK_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
}

/** Parse `_ga` cookie → GA4 client_id (`XXXXXXXXXX.YYYYYYYYYY`). */
export function readGaClientIdFromCookie(): string | undefined {
  const raw = readCookie('_ga');
  if (!raw) return undefined;
  const parts = raw.split('.');
  if (parts.length >= 4) {
    const clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (/^\d+\.\d+$/.test(clientId)) return clientId;
  }
  return undefined;
}

/** Parse `_ga_<container>` cookie → GA4 session_id (third dot-separated segment). */
export function readGaSessionIdFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const chunk of document.cookie.split(';')) {
    const trimmed = chunk.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    if (!name.startsWith('_ga_')) continue;
    const value = trimmed.slice(eq + 1);
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      // use raw
    }
    const parts = decoded.split('.');
    // GS1.1.<session_id>... or GS2.1.s<session_id>...
    if (parts.length >= 3 && (parts[0] === 'GS1' || parts[0] === 'GS2')) {
      const sessionPart = parts[2];
      if (sessionPart) {
        const sessionId = sessionPart.startsWith('s') ? sessionPart.slice(1) : sessionPart;
        if (sessionId) return sessionId;
      }
    }
  }
  return undefined;
}

/** Persist ad click ids from URL into cookies (~90 days) and sessionStorage. */
export function captureAdClickIdsFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid')?.trim();
    const gbraid = params.get('gbraid')?.trim();
    const wbraid = params.get('wbraid')?.trim();
    if (!gclid && !gbraid && !wbraid) return;

    if (gclid) writeCookie(AD_CLICK_COOKIE_GCLID, gclid);
    if (gbraid) writeCookie(AD_CLICK_COOKIE_GBRAID, gbraid);
    if (wbraid) writeCookie(AD_CLICK_COOKIE_WBRAID, wbraid);

    window.sessionStorage.setItem(
      AD_CLICK_STORAGE_KEY,
      JSON.stringify({ gclid: gclid || undefined, gbraid: gbraid || undefined, wbraid: wbraid || undefined }),
    );
  } catch {
    // ignore
  }
}

function readAdClickIdFromCookieOrStorage(
  cookieName: string,
  key: 'gclid' | 'gbraid' | 'wbraid',
): string | undefined {
  const fromCookie = readCookie(cookieName)?.trim();
  if (fromCookie) return fromCookie;

  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(AD_CLICK_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, string | undefined>;
    const fromStorage = parsed[key]?.trim();
    return fromStorage || undefined;
  } catch {
    return undefined;
  }
}

function readStoredAdClickIds(): Pick<CheckoutAnalyticsContext, 'gclid' | 'gbraid' | 'wbraid'> {
  const gclid = readAdClickIdFromCookieOrStorage(AD_CLICK_COOKIE_GCLID, 'gclid');
  const gbraid = readAdClickIdFromCookieOrStorage(AD_CLICK_COOKIE_GBRAID, 'gbraid');
  const wbraid = readAdClickIdFromCookieOrStorage(AD_CLICK_COOKIE_WBRAID, 'wbraid');
  return {
    ...(gclid ? { gclid } : {}),
    ...(gbraid ? { gbraid } : {}),
    ...(wbraid ? { wbraid } : {}),
  };
}

/** Full analytics context to attach to checkout session request. */
export function readCheckoutAnalyticsContext(): CheckoutAnalyticsContext {
  const ga_client_id = readGaClientIdFromCookie();
  const ga_session_id = readGaSessionIdFromCookie();
  const adIds = readStoredAdClickIds();
  return {
    ...(ga_client_id ? { ga_client_id } : {}),
    ...(ga_session_id ? { ga_session_id } : {}),
    ...adIds,
  };
}
