export const CAMPAIGN_DRAFT_STATUSES = [
  'draft',
  'validated',
  'approved',
  'created',
  'failed',
  'cancelled',
] as const;

export type CampaignDraftStatus = (typeof CAMPAIGN_DRAFT_STATUSES)[number];

export const KEYWORD_MATCH_TYPES = ['EXACT', 'PHRASE'] as const;
export type KeywordMatchType = (typeof KEYWORD_MATCH_TYPES)[number];

export interface CampaignBrief {
  territory: string;
  territoryGeoTargetId?: number;
  dailyBudgetThb: number;
  campaignGoal?: string;
  finalUrl: string;
  occasion?: string;
  productFocus?: string;
  startDate?: string;
  endDate?: string;
  applyDefaultNegatives: boolean;
  skipArtwork: boolean;
}

export interface KeywordDraft {
  text: string;
  matchType: KeywordMatchType;
}

export interface AdGroupDraft {
  name: string;
  keywords: KeywordDraft[];
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
}

export interface SearchCampaignDraft {
  campaignName: string;
  campaignType: 'SEARCH';
  languageCode: 'en';
  territory: string;
  territoryGeoTargetId: number;
  dailyBudgetThb: number;
  biddingStrategy: 'MANUAL_CPC' | 'MAXIMIZE_CLICKS';
  adGroups: AdGroupDraft[];
  negativeKeywords: KeywordDraft[];
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  field: string;
  type: 'text' | 'number' | 'url' | 'boolean' | 'select';
  options?: string[];
  required: boolean;
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  field?: string;
}

export interface CampaignValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  estimatedRisk: 'low' | 'medium' | 'high';
  dryRunResourceNames?: string[];
}

export interface CampaignDraftRecord {
  id: string;
  status: CampaignDraftStatus;
  adminEmail: string;
  naturalLanguagePrompt: string;
  questionAnswers: Record<string, unknown>;
  structuredBrief: CampaignBrief | null;
  campaignDraft: SearchCampaignDraft | null;
  validationResult: CampaignValidationResult | null;
  selectedAssetResourceNames: string[];
  googleAdsResourceNames: Record<string, unknown> | null;
  applyError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleAdsAssetSummary {
  resourceName: string;
  name: string;
  type: string;
  imageUrl?: string;
}

function isKeywordMatchType(v: unknown): v is KeywordMatchType {
  return v === 'EXACT' || v === 'PHRASE';
}

export function parseKeywordDraft(raw: unknown): KeywordDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid keyword');
  const obj = raw as Record<string, unknown>;
  const text = String(obj.text ?? '').trim();
  if (!text) throw new Error('Keyword text is required');
  const matchType = obj.matchType ?? 'PHRASE';
  if (!isKeywordMatchType(matchType)) throw new Error('Invalid keyword match type');
  return { text, matchType };
}

export function parseAdGroupDraft(raw: unknown): AdGroupDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid ad group');
  const obj = raw as Record<string, unknown>;
  const name = String(obj.name ?? '').trim();
  if (!name) throw new Error('Ad group name is required');
  const keywords = Array.isArray(obj.keywords) ? obj.keywords.map(parseKeywordDraft) : [];
  if (keywords.length === 0) throw new Error('Ad group needs at least one keyword');
  const headlines = Array.isArray(obj.headlines) ? obj.headlines.map(String).filter(Boolean) : [];
  const descriptions = Array.isArray(obj.descriptions) ? obj.descriptions.map(String).filter(Boolean) : [];
  if (headlines.length < 3) throw new Error('Ad group needs at least 3 headlines');
  if (descriptions.length < 2) throw new Error('Ad group needs at least 2 descriptions');
  const finalUrl = String(obj.finalUrl ?? '').trim();
  if (!finalUrl) throw new Error('Ad group final URL is required');
  return { name, keywords, headlines, descriptions, finalUrl };
}

export function parseSearchCampaignDraft(raw: unknown): SearchCampaignDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid campaign draft');
  const obj = raw as Record<string, unknown>;
  const campaignName = String(obj.campaignName ?? '').trim();
  if (!campaignName) throw new Error('Campaign name is required');
  if (obj.campaignType !== 'SEARCH') throw new Error('Only SEARCH campaigns are supported');
  if (obj.languageCode !== 'en') throw new Error('Campaign language must be en');
  const territory = String(obj.territory ?? '').trim();
  const territoryGeoTargetId = Number(obj.territoryGeoTargetId);
  const dailyBudgetThb = Number(obj.dailyBudgetThb);
  if (!territory || !Number.isFinite(territoryGeoTargetId) || territoryGeoTargetId <= 0) {
    throw new Error('Territory and geo target are required');
  }
  if (!Number.isFinite(dailyBudgetThb) || dailyBudgetThb <= 0) {
    throw new Error('Daily budget must be positive');
  }
  const adGroups = Array.isArray(obj.adGroups) ? obj.adGroups.map(parseAdGroupDraft) : [];
  if (adGroups.length === 0) throw new Error('At least one ad group is required');
  const negativeKeywords = Array.isArray(obj.negativeKeywords)
    ? obj.negativeKeywords.map(parseKeywordDraft)
    : [];
  const biddingStrategy = obj.biddingStrategy === 'MAXIMIZE_CLICKS' ? 'MAXIMIZE_CLICKS' : 'MANUAL_CPC';

  return {
    campaignName,
    campaignType: 'SEARCH',
    languageCode: 'en',
    territory,
    territoryGeoTargetId,
    dailyBudgetThb,
    biddingStrategy,
    adGroups,
    negativeKeywords,
    startDate: obj.startDate ? String(obj.startDate) : undefined,
    endDate: obj.endDate ? String(obj.endDate) : undefined,
    notes: obj.notes ? String(obj.notes) : undefined,
  };
}

export function parseCampaignBrief(raw: unknown): CampaignBrief {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid brief');
  const obj = raw as Record<string, unknown>;
  const territory = String(obj.territory ?? '').trim();
  const dailyBudgetThb = Number(obj.dailyBudgetThb);
  const finalUrl = String(obj.finalUrl ?? '').trim();
  if (!territory) throw new Error('Territory is required');
  if (!Number.isFinite(dailyBudgetThb) || dailyBudgetThb <= 0) throw new Error('Daily budget is required');
  if (!finalUrl) throw new Error('Final URL is required');

  return {
    territory,
    territoryGeoTargetId: obj.territoryGeoTargetId ? Number(obj.territoryGeoTargetId) : undefined,
    dailyBudgetThb,
    campaignGoal: obj.campaignGoal ? String(obj.campaignGoal) : undefined,
    finalUrl,
    occasion: obj.occasion ? String(obj.occasion) : undefined,
    productFocus: obj.productFocus ? String(obj.productFocus) : undefined,
    startDate: obj.startDate ? String(obj.startDate) : undefined,
    endDate: obj.endDate ? String(obj.endDate) : undefined,
    applyDefaultNegatives: obj.applyDefaultNegatives !== false,
    skipArtwork: obj.skipArtwork !== false,
  };
}
