import 'server-only';

import { GoogleAdsApi } from 'google-ads-api';
import { assertGoogleAdsRefreshToken } from './googleAdsAccessToken';
import { getGoogleAdsConfig, type GoogleAdsConfig } from './config';
import { loadStoredGoogleAdsOAuth } from './googleAdsOAuthStore';

export async function getResolvedGoogleAdsConfig(): Promise<GoogleAdsConfig | null> {
  const env = getGoogleAdsConfig();
  if (!env) return null;
  const stored = await loadStoredGoogleAdsOAuth();
  if (stored?.refreshToken) {
    return { ...env, refreshToken: stored.refreshToken };
  }
  return env;
}

/**
 * google-ads-api calls `error.metadata.internalRepr.get(...)` without optional chaining.
 * OAuth and REST failures then crash as "Cannot read properties of undefined (reading 'get')"
 * and hide the real invalid_grant / Ads error.
 */
function patchGoogleAdsErrorParser(customer: ReturnType<GoogleAdsApi['Customer']>) {
  const proto = Object.getPrototypeOf(customer) as {
    getGoogleAdsError?: (error: unknown) => unknown;
  };
  const original = proto.getGoogleAdsError?.bind(customer);
  Object.assign(customer, {
    getGoogleAdsError(error: unknown) {
      const internalRepr = (error as { metadata?: { internalRepr?: { get?: unknown } } } | undefined)
        ?.metadata?.internalRepr;
      if (!internalRepr || typeof internalRepr.get !== 'function') {
        return error;
      }
      try {
        return original ? original(error) : error;
      } catch {
        return error;
      }
    },
  });
}

export async function createGoogleAdsCustomer(): Promise<{
  customer: ReturnType<GoogleAdsApi['Customer']>;
  config: GoogleAdsConfig;
}> {
  const config = await getResolvedGoogleAdsConfig();
  if (!config) throw new Error('Google Ads is not configured');

  await assertGoogleAdsRefreshToken(config);

  const client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  const customer = client.Customer({
    customer_id: config.customerId,
    refresh_token: config.refreshToken,
    login_customer_id: config.loginCustomerId,
  });
  patchGoogleAdsErrorParser(customer);

  return { config, customer };
}
