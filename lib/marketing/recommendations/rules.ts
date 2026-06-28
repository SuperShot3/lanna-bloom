import 'server-only';

import { MARKETING_SAFETY } from '../config';
import type { AdsOverview, DiagnosticsMetrics, FunnelReport, MarketingRecommendation, PerformanceFlag } from '../types';
import type { RecommendationDraft } from './draftTypes';

function funnelCount(funnel: FunnelReport | null | undefined, event: string): number {
  return funnel?.steps.find((s) => s.event === event)?.count ?? 0;
}

export function buildFunnelRecommendations(
  funnel: FunnelReport | null | undefined,
  overview?: AdsOverview | null,
  metrics?: DiagnosticsMetrics | null,
): RecommendationDraft[] {
  const drafts: RecommendationDraft[] = [];
  if (!funnel) return drafts;

  const addToCart = metrics?.funnelEventCounts.add_to_cart ?? funnelCount(funnel, 'add_to_cart');
  const viewCart = metrics?.funnelEventCounts.view_cart ?? funnelCount(funnel, 'view_cart');
  const beginCheckout = metrics?.funnelEventCounts.begin_checkout ?? funnelCount(funnel, 'begin_checkout');
  const addPaymentInfo = metrics?.funnelEventCounts.add_payment_info ?? funnelCount(funnel, 'add_payment_info');
  const purchases = metrics?.funnelEventCounts.purchase ?? funnelCount(funnel, 'purchase');
  const adsClicks = overview?.summary.clicks ?? metrics?.adsClicks ?? 0;

  if (adsClicks >= 50 && addToCart === 0) {
    drafts.push({
      actionType: 'suggest_landing_page',
      title: 'Review landing page relevance',
      summary: 'Paid clicks are arriving but no add-to-cart events — landing page or intent may be mismatched.',
      reasoning: `${adsClicks} ad clicks with 0 add_to_cart events in GA4 for this period.`,
      confidence: 'medium',
      riskLevel: 'low',
      canApplyViaApi: false,
      evidence: { clicks: adsClicks, addToCart: 0 },
    });
  }

  if (viewCart >= 10 && beginCheckout < viewCart * 0.2) {
    drafts.push({
      actionType: 'manual_review',
      title: 'Review cart → checkout UX',
      summary: 'Many cart views but few begin_checkout events — check mobile checkout flow and delivery form.',
      reasoning: `${viewCart} view_cart vs ${beginCheckout} begin_checkout (${Math.round((beginCheckout / viewCart) * 100)}% progression).`,
      confidence: 'medium',
      riskLevel: 'low',
      canApplyViaApi: false,
      evidence: { viewCart, beginCheckout },
    });
  }

  if (addPaymentInfo >= 5 && purchases === 0) {
    drafts.push({
      actionType: 'manual_review',
      title: 'Verify GTM purchase on thank-you page',
      summary: 'Payment clicks recorded but no purchase events — purchase tag may be broken.',
      reasoning: `${addPaymentInfo} add_payment_info events but 0 purchase events. Check /lanna-order-thank-you GTM setup.`,
      confidence: 'high',
      riskLevel: 'medium',
      canApplyViaApi: false,
      evidence: { addPaymentInfo, purchases },
    });
  }

  return drafts;
}

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
