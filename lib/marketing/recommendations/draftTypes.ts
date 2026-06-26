import type { MarketingConfidence, MarketingRiskLevel, RecommendationActionType } from '../types';

export interface RecommendationDraft {
  actionType: RecommendationActionType;
  title: string;
  summary: string;
  reasoning: string;
  confidence: MarketingConfidence;
  riskLevel: MarketingRiskLevel;
  canApplyViaApi: boolean;
  campaignId?: string;
  campaignName?: string;
  adGroupId?: string;
  adGroupName?: string;
  keywordText?: string;
  searchTerm?: string;
  proposedChange?: Record<string, unknown>;
  evidence: Record<string, unknown>;
}
