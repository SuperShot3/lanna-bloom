import 'server-only';

import OpenAI from 'openai';
import { buildDefaultNegativeKeywords } from './negativeKeywords';
import { mergeBriefFromAnswers } from './questionPlanner';
import { resolveTerritoryGeoTargetId } from './territories';
import type { CampaignBrief, SearchCampaignDraft } from './types';
import { parseSearchCampaignDraft } from './types';

export const CAMPAIGN_BUILDER_PROMPT_VERSION = 'campaign-builder-v1';

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function buildKeywordTemplates(brief: CampaignBrief): string[] {
  const city = brief.territory;
  const templates = [
    `flower delivery ${city}`,
    `same day flower delivery ${city}`,
    `bouquet delivery ${city}`,
    `flower gift delivery ${city}`,
    `send flowers ${city}`,
    `online flower delivery ${city}`,
  ];

  if (brief.occasion) {
    templates.push(`${brief.occasion} flowers ${city}`);
    templates.push(`${brief.occasion} flower delivery ${city}`);
    templates.push(`${brief.occasion} bouquet ${city}`);
  }

  if (brief.productFocus?.toLowerCase().includes('same day')) {
    templates.push(`same day flowers ${city}`);
    templates.push(`flowers delivered today ${city}`);
  }

  return Array.from(new Set(templates));
}

function buildRuleBasedDraft(brief: CampaignBrief): SearchCampaignDraft {
  const geoId = resolveTerritoryGeoTargetId(brief.territory);
  if (!geoId) {
    throw new Error(`Unsupported territory: ${brief.territory}`);
  }

  const keywordTemplates = buildKeywordTemplates(brief);
  const occasionLabel = brief.occasion ?? 'general';
  const campaignName = `EN Search | ${brief.territory} | ${occasionLabel}`.slice(0, 255);

  const coreKeywords = keywordTemplates.slice(0, 6).map((text) => ({
    text,
    matchType: 'PHRASE' as const,
  }));

  const occasionKeywords = keywordTemplates.slice(6).map((text) => ({
    text,
    matchType: 'EXACT' as const,
  }));

  const adGroups: SearchCampaignDraft['adGroups'] = [
    {
      name: `${brief.territory} — Core delivery`,
      keywords: coreKeywords,
      headlines: [
        `Flower Delivery in ${brief.territory}`,
        `Fresh Bouquets Delivered`,
        `Order Flowers Online`,
        `Same-Day Delivery Available`,
        `Lanna Bloom Florist`,
        `Beautiful Gift Bouquets`,
      ],
      descriptions: [
        `Send fresh flowers in ${brief.territory}. Order online with local delivery.`,
        `Handcrafted bouquets for birthdays, celebrations, and gifts. English checkout.`,
      ],
      finalUrl: brief.finalUrl,
    },
  ];

  if (occasionKeywords.length > 0) {
    adGroups.push({
      name: `${brief.territory} — ${occasionLabel}`,
      keywords: occasionKeywords,
      headlines: [
        `${brief.occasion ?? 'Gift'} Flowers ${brief.territory}`,
        `Fresh ${brief.occasion ?? 'Gift'} Bouquets`,
        `Flower Delivery ${brief.territory}`,
        `Order Online Today`,
        `Lanna Bloom Delivery`,
      ],
      descriptions: [
        `${brief.occasion ?? 'Gift'} flower delivery in ${brief.territory}. Fresh bouquets, easy online ordering.`,
        `Trusted local florist. English-friendly ordering and delivery updates.`,
      ],
      finalUrl: brief.finalUrl,
    });
  }

  const negativeKeywords = brief.applyDefaultNegatives
    ? buildDefaultNegativeKeywords({ territory: brief.territory, occasion: brief.occasion })
    : [];

  return {
    campaignName,
    campaignType: 'SEARCH',
    languageCode: 'en',
    territory: brief.territory,
    territoryGeoTargetId: geoId,
    dailyBudgetThb: brief.dailyBudgetThb,
    biddingStrategy: 'MANUAL_CPC',
    adGroups,
    negativeKeywords,
    startDate: brief.startDate,
    endDate: brief.endDate,
    notes: brief.campaignGoal,
  };
}

async function refineDraftWithLlm(
  brief: CampaignBrief,
  baseDraft: SearchCampaignDraft,
): Promise<SearchCampaignDraft> {
  const client = getClient();
  if (!client) return baseDraft;

  const system = `You refine Google Ads Search campaign drafts for Lanna Bloom, an English-first flower delivery shop in Thailand.
Return JSON only matching this schema:
{
  "campaignName": string,
  "adGroups": [{ "name": string, "keywords": [{ "text": string, "matchType": "EXACT"|"PHRASE" }], "headlines": string[], "descriptions": string[], "finalUrl": string }]
}
Rules:
- English keywords and ad copy only. No Thai characters.
- Prefer EXACT and PHRASE match. No BROAD match.
- Headlines max 30 chars, descriptions max 90 chars when possible.
- Do not promise guaranteed delivery times unless "same-day" is explicitly in the brief.
- Keep finalUrl as provided.
- Max 3 ad groups, max 12 keywords per ad group.
- Do not change campaignType, territory, budget, or negative keywords.`;

  const user = JSON.stringify({ brief, baseDraft }, null, 2);

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
    if (!raw) return baseDraft;

    const parsed = JSON.parse(raw) as Partial<SearchCampaignDraft>;
    const merged: SearchCampaignDraft = {
      ...baseDraft,
      campaignName: parsed.campaignName ?? baseDraft.campaignName,
      adGroups: parsed.adGroups ?? baseDraft.adGroups,
    };

    const validated = parseSearchCampaignDraft(merged);
    return validated;
  } catch {
    return baseDraft;
  }
}

export async function generateSearchCampaignDraft(input: {
  prompt: string;
  answers?: Record<string, unknown>;
  useLlm?: boolean;
}): Promise<{ brief: CampaignBrief; draft: SearchCampaignDraft; llmUsed: boolean }> {
  const brief = mergeBriefFromAnswers({ prompt: input.prompt, answers: input.answers });
  let draft = buildRuleBasedDraft(brief);
  let llmUsed = false;

  if (input.useLlm !== false) {
    const refined = await refineDraftWithLlm(brief, draft);
    if (refined !== draft) llmUsed = true;
    draft = refined;
  }

  const validated = parseSearchCampaignDraft(draft);
  return { brief, draft: validated, llmUsed };
}
