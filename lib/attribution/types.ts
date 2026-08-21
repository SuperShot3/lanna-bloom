export type AttributionSource = 'google' | 'direct' | 'organic' | 'referral' | 'unknown';

export type OfflineConversionStatus =
  | 'not_applicable'
  | 'pending'
  | 'sent'
  | 'failed'
  | 'retry';

export interface AttributionSnapshot {
  visitorId?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  campaignId?: string;
  adgroupId?: string;
  keyword?: string;
  device?: string;
  network?: string;
  matchtype?: string;
  landingPage?: string;
  referrer?: string;
  /** Unix ms of the last Google Ads click that set click ids. */
  googleClickAt?: number;
  /** Unix ms of last snapshot update. */
  updatedAt?: number;
}

export interface AttributionSessionRow {
  id: string;
  visitor_id: string;
  source: string | null;
  medium: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_id: string | null;
  adgroup_id: string | null;
  keyword: string | null;
  device: string | null;
  network: string | null;
  matchtype: string | null;
  landing_page: string | null;
  referrer: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export interface FirstPartyGoogleAdsStats {
  count: number;
  revenue: number;
  aov: number;
}

export interface FirstPartyAttributedOrderRow {
  orderId: string;
  paidAt: string | null;
  revenue: number;
  currency: string;
  phoneCountryCode: string | null;
  deliveryDestination: string | null;
  source: string | null;
  googleAds: boolean;
  hasClickId: boolean;
  campaign: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  offlineConversionStatus: string | null;
}

export interface FirstPartyBreakdownRow {
  key: string;
  count: number;
  revenue: number;
}

export interface FirstPartyAttributionReport {
  googleAdsPaid: FirstPartyGoogleAdsStats;
  recentPaidOrders: FirstPartyAttributedOrderRow[];
  byDestination: FirstPartyBreakdownRow[];
  byCampaign: FirstPartyBreakdownRow[];
}
