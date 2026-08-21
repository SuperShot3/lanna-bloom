import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getGoogleAdsOAuthClient, getGoogleAdsOAuthRedirectUri } from './config';

export const GOOGLE_ADS_OAUTH_STATE_COOKIE = 'lb_gads_oauth_state';
export const GOOGLE_ADS_OAUTH_SCOPE = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/datamanager',
].join(' ');

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export type GoogleAdsOAuthReturnTo = 'marketing' | 'settings';

export function parseGoogleAdsOAuthReturnTo(raw: string | null | undefined): GoogleAdsOAuthReturnTo {
  return raw === 'settings' ? 'settings' : 'marketing';
}

export function googleAdsOAuthSuccessPath(returnTo: GoogleAdsOAuthReturnTo): string {
  if (returnTo === 'settings') {
    return '/admin/settings/collections?google_ads=connected';
  }
  return '/admin/marketing?tab=ads&google_ads=connected';
}

export function googleAdsOAuthErrorPath(
  returnTo: GoogleAdsOAuthReturnTo,
  reason: string,
): string {
  const params = new URLSearchParams({ google_ads: 'error', reason });
  if (returnTo === 'settings') {
    return `/admin/settings/collections?${params.toString()}`;
  }
  params.set('tab', 'ads');
  return `/admin/marketing?${params.toString()}`;
}

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error('AUTH_SECRET is required for Google Ads OAuth.');
  return secret;
}

export function createGoogleAdsOAuthState(returnTo: GoogleAdsOAuthReturnTo): string {
  const nonce = randomBytes(16).toString('hex');
  const payload = `${nonce}.${Date.now()}.${returnTo}`;
  const sig = createHmac('sha256', signingSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyGoogleAdsOAuthState(
  state: string | null | undefined,
  cookieValue: string | null | undefined,
): { ok: true; returnTo: GoogleAdsOAuthReturnTo } | { ok: false } {
  if (!state || !cookieValue || state !== cookieValue) return { ok: false };
  const parts = state.split('.');
  if (parts.length !== 4) return { ok: false };
  const [nonce, tsRaw, returnToRaw, sig] = parts;
  if (!nonce || !tsRaw || !sig) return { ok: false };
  const payload = `${nonce}.${tsRaw}.${returnToRaw}`;
  const expected = createHmac('sha256', signingSecret()).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || Date.now() - ts > STATE_MAX_AGE_MS) return { ok: false };
  return { ok: true, returnTo: parseGoogleAdsOAuthReturnTo(returnToRaw) };
}

export function buildGoogleAdsAuthorizeUrl(state: string): string {
  const oauth = getGoogleAdsOAuthClient();
  if (!oauth) throw new Error('Google Ads OAuth client is not configured');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', oauth.clientId);
  url.searchParams.set('redirect_uri', getGoogleAdsOAuthRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_ADS_OAUTH_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeGoogleAdsAuthorizationCode(code: string): Promise<string> {
  const oauth = getGoogleAdsOAuthClient();
  if (!oauth) throw new Error('Google Ads OAuth client is not configured');

  const body = new URLSearchParams({
    code,
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    redirect_uri: getGoogleAdsOAuthRedirectUri(),
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json().catch(() => null)) as {
    refresh_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok) {
    const detail = data?.error_description || data?.error || `HTTP ${res.status}`;
    throw new Error(`Google token exchange failed: ${detail}`);
  }
  const refreshToken = data?.refresh_token?.trim();
  if (!refreshToken) {
    throw new Error(
      'Google did not return a refresh token. Reconnect again and make sure you grant access (prompt=consent).',
    );
  }
  return refreshToken;
}
