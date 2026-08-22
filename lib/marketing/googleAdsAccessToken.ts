import 'server-only';

import type { GoogleAdsConfig } from './config';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const okUntilByRefreshToken = new Map<string, number>();
const inflightByRefreshToken = new Map<string, Promise<void>>();

function invalidGrantError(detail: string): Error {
  return new Error(`invalid_grant${detail ? `: ${detail}` : ''}`);
}

async function refreshOnce(config: GoogleAdsConfig): Promise<number> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  const oauthError = data?.error ?? '';
  if (oauthError === 'invalid_grant' || /invalid_grant/i.test(data?.error_description ?? '')) {
    throw invalidGrantError(data?.error_description ?? 'Token has been expired or revoked.');
  }
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || `Google OAuth refresh failed (HTTP ${res.status})`);
  }
  return data.expires_in ?? 3600;
}

/** Validate the refresh token before google-ads-api, which crashes on invalid_grant. */
export async function assertGoogleAdsRefreshToken(config: GoogleAdsConfig): Promise<void> {
  const key = config.refreshToken;
  const until = okUntilByRefreshToken.get(key);
  if (until && Date.now() < until) return;

  let pending = inflightByRefreshToken.get(key);
  if (!pending) {
    pending = refreshOnce(config)
      .then((expiresIn) => {
        okUntilByRefreshToken.set(key, Date.now() + Math.max(60_000, (expiresIn - 120) * 1000));
      })
      .finally(() => {
        inflightByRefreshToken.delete(key);
      });
    inflightByRefreshToken.set(key, pending);
  }
  await pending;
}
