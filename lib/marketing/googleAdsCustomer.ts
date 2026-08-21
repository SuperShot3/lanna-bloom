import 'server-only';

import { GoogleAdsApi } from 'google-ads-api';
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

export async function createGoogleAdsCustomer(): Promise<{
  customer: ReturnType<GoogleAdsApi['Customer']>;
  config: GoogleAdsConfig;
}> {
  const config = await getResolvedGoogleAdsConfig();
  if (!config) throw new Error('Google Ads is not configured');

  const client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  return {
    config,
    customer: client.Customer({
      customer_id: config.customerId,
      refresh_token: config.refreshToken,
      login_customer_id: config.loginCustomerId,
    }),
  };
}
