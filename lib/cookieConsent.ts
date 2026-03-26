export type ConsentVersion = 1;

export type ConsentState = {
  v: ConsentVersion;
  /** analytics (e.g., GA4) */
  a: boolean;
  /** marketing (e.g., Google Ads) */
  m: boolean;
  /** ISO timestamp when user last saved */
  t: string;
};

export const CONSENT_COOKIE_NAME = 'lb_cookie_consent';
export const CONSENT_VERSION: ConsentVersion = 1;

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getDefaultConsent(): ConsentState {
  return { v: CONSENT_VERSION, a: false, m: false, t: new Date().toISOString() };
}

function parseCookieString(cookieString: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of cookieString.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    out[k] = v;
  }
  return out;
}

export function readConsentFromDocumentCookie(): ConsentState | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = parseCookieString(document.cookie || '');
    const raw = cookies[CONSENT_COOKIE_NAME];
    if (!raw) return null;
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as Partial<ConsentState>;
    if (parsed.v !== CONSENT_VERSION) return null;
    if (typeof parsed.a !== 'boolean' || typeof parsed.m !== 'boolean') return null;
    const t = typeof parsed.t === 'string' && parsed.t ? parsed.t : new Date().toISOString();
    return { v: CONSENT_VERSION, a: parsed.a, m: parsed.m, t };
  } catch {
    return null;
  }
}

export function writeConsentCookie(consent: ConsentState): void {
  if (typeof document === 'undefined') return;
  const payload: ConsentState = {
    v: CONSENT_VERSION,
    a: Boolean(consent.a),
    m: Boolean(consent.m),
    t: consent.t || new Date().toISOString(),
  };
  const value = encodeURIComponent(JSON.stringify(payload));
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
  // Lax is enough here: preferences cookie, not for cross-site requests.
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function isConsentGranted(consent: ConsentState | null | undefined, category: 'analytics' | 'marketing'): boolean {
  if (!consent) return false;
  return category === 'analytics' ? consent.a : consent.m;
}

