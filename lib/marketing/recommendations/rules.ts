import 'server-only';

import { MARKETING_SAFETY } from '../config';
import type { AdsOverview, MarketingRecommendation, PerformanceFlag } from '../types';
import type { RecommendationDraft } from './draftTypes';

export function buildRuleBasedRecommendations(
  overview: AdsOverview,
  flags: PerformanceFlag[],
): RecommendationDraft[] {
  const drafts: RecommendationDraft[] = [];

  for (const flag of flags) {
    if (flag.code === 'search_term_waste' && flag.entityName) {
      const term = overview.searchTerms.find((s) => s.name === flag.entityName);
      drafts.push({
        actionType: 'add_negative_keyword',
        title: `Add negative keyword: "${flag.entityName}"`,
        summary: 'Block a search term that spent money without conversions.',
        reasoning: flag.detail,
        confidence: 'high',
        riskLevel: 'low',
        canApplyViaApi: Boolean(term?.campaignId),
        campaignId: term?.campaignId,
        campaignName: term?.campaignName,
        adGroupId: term?.adGroupId,
        adGroupName: term?.adGroupName,
        searchTerm: flag.entityName,
        proposedChange: {
          matchType: 'PHRASE',
          keywordText: flag.entityName,
        },
        evidence: term
          ? { spend: term.spend, clicks: term.clicks, conversions: term.conversions }
          : {},
      });
    }

    if (flag.code === 'keyword_clicks_no_conversions' && flag.entityName) {
      const keyword = overview.keywords.find((k) => k.name === flag.entityName);
      drafts.push({
        actionType: 'pause_keyword',
        title: `Pause keyword: "${flag.entityName}"`,
        summary: 'Pause a keyword with enough clicks and spend but no conversions.',
        reasoning: flag.detail,
        confidence: 'medium',
        riskLevel: 'medium',
        canApplyViaApi: true,
        campaignId: keyword?.campaignId,
        campaignName: keyword?.campaignName,
        adGroupId: keyword?.adGroupId,
        adGroupName: keyword?.adGroupName,
        keywordText: flag.entityName,
        proposedChange: { pause: true },
        evidence: keyword
          ? {
              spend: keyword.spend,
              clicks: keyword.clicks,
              conversions: keyword.conversions,
              cpa: keyword.cpa,
              roas: keyword.roas,
              criterionId: keyword.id,
            }
          : {},
      });
    }

    if (flag.code === 'high_spend_no_conversions') {
      drafts.push({
        actionType: 'manual_review',
        title: `Review campaign spend: ${flag.entityName ?? 'campaign'}`,
        summary: 'Campaign has meaningful spend and clicks but no conversions.',
        reasoning: flag.detail,
        confidence: 'medium',
        riskLevel: 'medium',
        canApplyViaApi: false,
        campaignName: flag.entityName,
        evidence: {},
      });
    }

    if (flag.code === 'good_roas_limited_spend' && flag.entityId) {
      const campaign = overview.campaigns.find((c) => c.id === flag.entityId);
      drafts.push({
        actionType: 'manual_review',
        title: `Consider budget increase: ${flag.entityName ?? 'campaign'}`,
        summary: 'Strong ROAS with limited spend — budget increases require manual approval.',
        reasoning: flag.detail,
        confidence: 'medium',
        riskLevel: 'low',
        canApplyViaApi: false,
        campaignId: flag.entityId,
        campaignName: flag.entityName,
        evidence: campaign
          ? { spend: campaign.spend, roas: campaign.roas, conversions: campaign.conversions }
          : {},
      });
    }

    if (flag.code === 'landing_page_underperforming') {
      drafts.push({
        actionType: 'suggest_landing_page',
        title: `Improve landing page: ${flag.entityName ?? 'page'}`,
        summary: 'Landing page converts worse than other pages in the account.',
        reasoning: flag.detail,
        confidence: 'low',
        riskLevel: 'low',
        canApplyViaApi: false,
        proposedChange: { landingPage: flag.entityName },
        evidence: {},
      });
    }
  }

  return drafts.slice(0, 15);
}

export function dedupeDrafts(drafts: RecommendationDraft[]): RecommendationDraft[] {
  const seen = new Set<string>();
  const out: RecommendationDraft[] = [];
  for (const d of drafts) {
    const key = `${d.actionType}:${d.keywordText ?? ''}:${d.searchTerm ?? ''}:${d.campaignId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

export const LLM_PROMPT_VERSION = MARKETING_SAFETY.llmPromptVersion;
