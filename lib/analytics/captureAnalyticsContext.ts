/**
 * Read GA4 / Google Ads identifiers from the browser for server-side purchase fallback.
 * Safe to call only on the client before checkout.
 */

const AD_CLICK_STORAGE_KEY = 'lanna_ad_click_ids';

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

/** Persist ad click ids from URL into sessionStorage for checkout. */
export function captureAdClickIdsFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid')?.trim();
    const gbraid = params.get('gbraid')?.trim();
    const wbraid = params.get('wbraid')?.trim();
    if (!gclid && !gbraid && !wbraid) return;
    window.sessionStorage.setItem(
      AD_CLICK_STORAGE_KEY,
      JSON.stringify({ gclid: gclid || undefined, gbraid: gbraid || undefined, wbraid: wbraid || undefined }),
    );
  } catch {
    // ignore
  }
}

function readStoredAdClickIds(): Pick<CheckoutAnalyticsContext, 'gclid' | 'gbraid' | 'wbraid'> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(AD_CLICK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { gclid?: string; gbraid?: string; wbraid?: string };
    return {
      ...(parsed.gclid ? { gclid: parsed.gclid } : {}),
      ...(parsed.gbraid ? { gbraid: parsed.gbraid } : {}),
      ...(parsed.wbraid ? { wbraid: parsed.wbraid } : {}),
    };
  } catch {
    return {};
  }
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
