import 'server-only';

import type { MarketingConfigStatus } from './types';

function normalizeCustomerId(raw: string | undefined): string | undefined {
  const v = raw?.trim().replace(/-/g, '');
  return v && /^\d+$/.test(v) ? v : undefined;
}

export interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId?: string;
}

export interface Ga4Config {
  propertyId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

export function isGoogleAdsConfigured(): boolean {
  return getGoogleAdsConfig() != null;
}

export function getGoogleAdsConfig(): GoogleAdsConfig | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim();
  const customerId = normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return null;
  }
  const loginCustomerId = normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId,
    loginCustomerId,
  };
}

function parseServiceAccountCredentials(): Ga4Config['credentials'] | null {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, '\n'),
        };
      }
    } catch {
      return null;
    }
  }
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }
  return null;
}

export function isGa4Configured(): boolean {
  return getGa4Config() != null;
}

export function getGa4Config(): Ga4Config | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const credentials = parseServiceAccountCredentials();
  if (!propertyId || !credentials) return null;
  return { propertyId, credentials };
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getMarketingConfigStatus(): MarketingConfigStatus {
  return {
    googleAds: isGoogleAdsConfigured(),
    ga4: isGa4Configured(),
    llm: isLlmConfigured(),
    supabase: Boolean(
      process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
  };
}

/** Safety limits — server-side guardrails for recommendations and apply. */
export const MARKETING_SAFETY = {
  minClicksForKeywordAction: 20,
  minSpendThbForKeywordAction: 100,
  minClicksForNegativeKeyword: 5,
  minSpendThbForNegativeKeyword: 50,
  maxBudgetIncreasePercent: 0,
  maxBudgetDecreasePercent: 15,
  maxAutoApplyPerDay: 0,
  defaultLookbackDays: 14,
  cacheTtlMs: 15 * 60 * 1000,
  llmPromptVersion: 'marketing-v1',
} as const;

export function isAutoApplyEnabled(): boolean {
  return process.env.MARKETING_AUTO_APPLY_ENABLED === 'true';
}
