import 'server-only';

import { getGoogleAdsOAuthClient } from '@/lib/marketing/config';
import { loadStoredGoogleAdsOAuth } from '@/lib/marketing/googleAdsOAuthStore';
import { sanitizeEnvSecret } from '@/lib/marketing/sanitizeEnvSecret';
import { getGoogleAdsPurchaseConversionActionId } from './conversionAction';

export const DATA_MANAGER_OAUTH_SCOPE = 'https://www.googleapis.com/auth/datamanager';
const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';

export interface DataManagerIngestConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId?: string;
  conversionActionId: string;
}

function normalizeCustomerId(raw: string | undefined): string | undefined {
  const v = sanitizeEnvSecret(raw)?.replace(/-/g, '');
  return v && /^\d+$/.test(v) ? v : undefined;
}

export async function getDataManagerIngestConfig(): Promise<DataManagerIngestConfig | null> {
  const oauth = getGoogleAdsOAuthClient();
  const customerId = normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  const conversionActionId = getGoogleAdsPurchaseConversionActionId();
  if (!oauth || !customerId || !conversionActionId) return null;

  const stored = await loadStoredGoogleAdsOAuth();
  const refreshToken =
    stored?.refreshToken || sanitizeEnvSecret(process.env.GOOGLE_ADS_REFRESH_TOKEN);
  if (!refreshToken) return null;

  const loginCustomerId = normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  return {
    clientId: oauth.clientId,
    clientSecret: oauth.clientSecret,
    refreshToken,
    customerId,
    loginCustomerId,
    conversionActionId,
  };
}

export function isDataManagerIngestConfiguredSyncHint(): boolean {
  return getGoogleAdsPurchaseConversionActionId() != null && getGoogleAdsOAuthClient() != null;
}

let cachedAccess: { token: string; expiresAt: number } | null = null;

export async function getDataManagerAccessToken(
  config: DataManagerIngestConfig,
): Promise<string> {
  if (cachedAccess && Date.now() < cachedAccess.expiresAt) {
    return cachedAccess.token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    const detail = data?.error_description || data?.error || `HTTP ${res.status}`;
    throw new Error(`Data Manager token refresh failed: ${detail}`);
  }

  const ttlMs = Math.max(60_000, ((data.expires_in ?? 3600) - 120) * 1000);
  cachedAccess = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return data.access_token;
}

export interface DataManagerEventInput {
  transactionId: string;
  eventTimestamp: string;
  conversionValue: number;
  currency: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}

export async function ingestDataManagerEvents(
  config: DataManagerIngestConfig,
  events: DataManagerEventInput[],
): Promise<{ requestId: string | null }> {
  if (events.length === 0) return { requestId: null };

  const accessToken = await getDataManagerAccessToken(config);
  const destination: Record<string, unknown> = {
    operatingAccount: {
      accountType: 'GOOGLE_ADS',
      accountId: config.customerId,
    },
    productDestinationId: config.conversionActionId,
  };
  if (config.loginCustomerId) {
    destination.loginAccount = {
      accountType: 'GOOGLE_ADS',
      accountId: config.loginCustomerId,
    };
  }

  const payload = {
    destinations: [destination],
    events: events.map((ev) => ({
      transactionId: ev.transactionId,
      eventTimestamp: ev.eventTimestamp,
      conversionValue: ev.conversionValue,
      currency: ev.currency,
      eventSource: 'WEB',
      adIdentifiers: {
        ...(ev.gclid ? { gclid: ev.gclid } : {}),
        ...(ev.gbraid ? { gbraid: ev.gbraid } : {}),
        ...(ev.wbraid ? { wbraid: ev.wbraid } : {}),
      },
    })),
  };

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as {
    requestId?: string;
    error?: { message?: string; status?: string };
    fieldWarnings?: unknown;
  } | null;

  if (!res.ok) {
    const detail = data?.error?.message || data?.error?.status || `HTTP ${res.status}`;
    throw new Error(`Data Manager ingest failed: ${detail}`);
  }

  return { requestId: data?.requestId?.trim() || null };
}
