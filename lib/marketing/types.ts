export type MarketingConfidence = 'low' | 'medium' | 'high';
export type MarketingRiskLevel = 'low' | 'medium' | 'high';

export type RecommendationStatus =
  | 'new'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'failed'
  | 'rolled_back_note';

export type RecommendationActionType =
  | 'add_negative_keyword'
  | 'pause_keyword'
  | 'enable_keyword'
  | 'adjust_campaign_budget'
  | 'suggest_landing_page'
  | 'suggest_ad_copy'
  | 'manual_review';

export interface AdsMetricRow {
  id: string;
  name: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  averageCpc: number;
  conversions: number;
  conversionValue: number;
  cpa: number | null;
  roas: number | null;
  campaignId?: string;
  campaignName?: string;
  adGroupId?: string;
  adGroupName?: string;
  landingPage?: string;
  matchType?: string;
}

export interface AdsOverview {
  dateFrom: string;
  dateTo: string;
  summary: AdsMetricRow;
  campaigns: AdsMetricRow[];
  adGroups: AdsMetricRow[];
  keywords: AdsMetricRow[];
  searchTerms: AdsMetricRow[];
  landingPages: AdsMetricRow[];
  flags: PerformanceFlag[];
}

export interface PerformanceFlag {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  entityType?: 'campaign' | 'keyword' | 'search_term' | 'landing_page';
  entityId?: string;
  entityName?: string;
}

export interface FunnelStep {
  event: string;
  label: string;
  count: number;
  dropoffFromPrevious: number | null;
  dropoffRateFromPrevious: number | null;
  rateFromPrevious: number | null;
  rateFromTop: number | null;
}

export interface PaidLandingPageRow {
  landingPage: string;
  sessions: number;
  addToCart: number;
  purchases: number;
  localeMismatch?: boolean;
}

export interface PaidLandingPagesReport {
  dateFrom: string;
  dateTo: string;
  pages: PaidLandingPageRow[];
}

export type DiagnosticsVerdictCode =
  | 'tracking_ads'
  | 'traffic_no_engagement'
  | 'checkout_friction'
  | 'purchase_tag_broken'
  | 'paid_underperforms'
  | 'healthy';

export interface DiagnosticsMetrics {
  paidOrderCount: number;
  paidOrderRevenue: number;
  ga4Purchases: number;
  adsConversions: number | null;
  adsSpend: number | null;
  adsClicks: number | null;
  adsImpressions: number | null;
  funnelEventCounts: Record<string, number>;
  paidSessions: number;
  organicSessions: number;
  paidPurchaseRate: number | null;
  organicPurchaseRate: number | null;
}

export interface DiagnosticsVerdict {
  code: DiagnosticsVerdictCode;
  severity: 'ok' | 'warn' | 'error';
  title: string;
  message: string;
  nextSteps: string[];
}

export interface DiagnosticsReport {
  dateFrom: string;
  dateTo: string;
  metrics: DiagnosticsMetrics;
  verdict: DiagnosticsVerdict;
  checks: TrackingHealthCheck[];
  configured: {
    ga4: boolean;
    googleAds: boolean;
    supabase: boolean;
  };
}

export interface FunnelReport {
  dateFrom: string;
  dateTo: string;
  steps: FunnelStep[];
  paidPurchaseRate: number | null;
  organicPurchaseRate: number | null;
  paidSessions: number;
  organicSessions: number;
}

export interface TrackingHealthCheck {
  code: string;
  status: 'ok' | 'warn' | 'error';
  title: string;
  detail: string;
  ga4Value?: number;
  referenceValue?: number;
}

export interface TrackingHealthReport {
  dateFrom: string;
  dateTo: string;
  checks: TrackingHealthCheck[];
}

export interface RecommendationEvidence {
  spend?: number;
  clicks?: number;
  impressions?: number;
  conversions?: number;
  conversionValue?: number;
  cpa?: number | null;
  roas?: number | null;
  [key: string]: unknown;
}

export interface MarketingRecommendation {
  id: string;
  status: RecommendationStatus;
  actionType: RecommendationActionType;
  title: string;
  summary: string;
  reasoning: string;
  confidence: MarketingConfidence;
  riskLevel: MarketingRiskLevel;
  canApplyViaApi: boolean;
  campaignId?: string | null;
  campaignName?: string | null;
  adGroupId?: string | null;
  adGroupName?: string | null;
  keywordText?: string | null;
  searchTerm?: string | null;
  proposedChange?: Record<string, unknown> | null;
  evidence: RecommendationEvidence;
  metricsSnapshot?: Record<string, unknown> | null;
  llmModel?: string | null;
  llmPromptVersion?: string | null;
  reviewerEmail?: string | null;
  reviewedAt?: string | null;
  appliedAt?: string | null;
  applyError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingConfigStatus {
  googleAds: boolean;
  ga4: boolean;
  llm: boolean;
  supabase: boolean;
}
