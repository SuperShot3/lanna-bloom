import 'server-only';

import OpenAI from 'openai';
import type { AdsOverview, FunnelReport } from '../types';
import { buildRuleBasedRecommendations, dedupeDrafts, LLM_PROMPT_VERSION } from './rules';
import type { RecommendationDraft } from './draftTypes';

export type { RecommendationDraft } from './draftTypes';

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function summarizeForLlm(overview: AdsOverview, funnel?: FunnelReport | null): string {
  const topCampaigns = overview.campaigns.slice(0, 8).map((c) => ({
    name: c.name,
    spend: c.spend,
    clicks: c.clicks,
    conversions: c.conversions,
    roas: c.roas,
    cpa: c.cpa,
  }));
  const topSearchTerms = overview.searchTerms.slice(0, 12).map((s) => ({
    term: s.name,
    spend: s.spend,
    clicks: s.clicks,
    conversions: s.conversions,
  }));
  const flags = overview.flags.slice(0, 10);
  const funnelSteps = funnel?.steps ?? [];

  return JSON.stringify({ topCampaigns, topSearchTerms, flags, funnelSteps }, null, 2);
}

async function generateLlmDrafts(
  overview: AdsOverview,
  funnel?: FunnelReport | null,
): Promise<RecommendationDraft[]> {
  const client = getClient();
  if (!client) return [];

  const system = `You are a Google Ads analyst for Lanna Bloom, a flower delivery shop in Chiang Mai, Thailand.
Return JSON only: { "recommendations": [ ... ] }.
Each item must use actionType one of: add_negative_keyword, pause_keyword, adjust_campaign_budget, suggest_landing_page, suggest_ad_copy, manual_review.
Include: title, summary, reasoning, confidence (low|medium|high), riskLevel (low|medium|high), canApplyViaApi (boolean),
optional campaignName, keywordText, searchTerm, proposedChange, evidence (spend, clicks, conversions, cpa, roas).
Never suggest budget increases (canApplyViaApi must be false for budget increases).
Only suggest pause_keyword or add_negative_keyword when there is enough spend/clicks and zero conversions.
Max 8 recommendations. Be specific and evidence-based.`;

  const user = `Analyze this marketing data and suggest improvements:\n${summarizeForLlm(overview, funnel)}`;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.MARKETING_LLM_MODEL?.trim() || 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { recommendations?: RecommendationDraft[] };
    const items = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    return items
      .filter((r) => r && typeof r.title === 'string' && typeof r.actionType === 'string')
      .map((r) => ({
        ...r,
        summary: r.summary ?? '',
        reasoning: r.reasoning ?? '',
        confidence: r.confidence ?? 'medium',
        riskLevel: r.riskLevel ?? 'medium',
        canApplyViaApi: Boolean(r.canApplyViaApi),
        evidence: r.evidence ?? {},
      }));
  } catch {
    return [];
  }
}

export async function generateRecommendationDrafts(input: {
  overview: AdsOverview;
  funnel?: FunnelReport | null;
  includeLlm?: boolean;
}): Promise<{ drafts: RecommendationDraft[]; llmModel: string | null; llmPromptVersion: string }> {
  const ruleDrafts = buildRuleBasedRecommendations(input.overview, input.overview.flags);
  let llmDrafts: RecommendationDraft[] = [];
  let llmModel: string | null = null;

  if (input.includeLlm !== false) {
    llmDrafts = await generateLlmDrafts(input.overview, input.funnel);
    if (llmDrafts.length > 0) {
      llmModel = process.env.MARKETING_LLM_MODEL?.trim() || 'gpt-4o-mini';
    }
  }

  const drafts = dedupeDrafts([...ruleDrafts, ...llmDrafts]);
  return { drafts, llmModel, llmPromptVersion: LLM_PROMPT_VERSION };
}

export { LLM_PROMPT_VERSION };
