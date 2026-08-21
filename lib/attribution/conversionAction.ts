import { sanitizeEnvSecret } from '@/lib/marketing/sanitizeEnvSecret';

/** Numeric Google Ads conversion action id from resource name or raw digits. */
export function parseGoogleAdsConversionActionId(raw: string | null | undefined): string | null {
  const v = sanitizeEnvSecret(raw) ?? raw?.trim();
  if (!v) return null;
  const resource = v.match(/^customers\/\d+\/conversionActions\/(\d+)$/);
  if (resource?.[1]) return resource[1];
  if (/^\d+$/.test(v)) return v;
  return null;
}

export function getGoogleAdsPurchaseConversionActionId(): string | null {
  return parseGoogleAdsConversionActionId(process.env.GOOGLE_ADS_PURCHASE_CONVERSION_ACTION);
}
