import 'server-only';

import { buildDefaultNegativeKeywords } from '../negativeKeywords';
import { callStructuredLlm, getStepLlmConfig } from '../llmClient';
import type { CampaignBrief, SearchCampaignDraft } from '../types';
import { buildRuleBasedAdGroupNames, buildRuleBasedKeywords } from './buildTerritoryContext';
import { formatGuidanceForPrompt, pickSanitizedGuidanceFields } from './customGuidance';
import {
  adCopySystemPrompt,
  adGroupsSystemPrompt,
  keywordsSystemPrompt,
  negativesSystemPrompt,
} from './stepPrompts';
import {
  buildCampaignName,
  type AdCopyStepOutput,
  AdGroupsStepOutput,
  KeywordsStepOutput,
  NegativeKeywordsStepOutput,
  StepOutputs,
  TerritoryContext,
  WizardStepId,
} from './steps';

export interface GenerateStepResult {
  output: StepOutputs[WizardStepId];
  source: 'rules' | 'ai' | 'rules+ai';
  llmUsage?: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  aiAvailable: boolean;
}

export async function generateStepOutput(
  stepId: WizardStepId,
  ctx: TerritoryContext,
  priorOutputs: StepOutputs,
): Promise<GenerateStepResult> {
  const config = getStepLlmConfig(stepId);

  switch (stepId) {
    case 'ad_groups':
      return generateAdGroups(ctx, priorOutputs, config.enabled);
    case 'keywords':
      return generateKeywords(ctx, priorOutputs, config.enabled);
    case 'negative_keywords':
      return generateNegatives(ctx, priorOutputs, config.enabled);
    case 'ad_copy':
      return generateAdCopy(ctx, priorOutputs, config.enabled);
    default:
      throw new Error(`Step ${stepId} does not support AI generation`);
  }
}

async function generateAdGroups(
  ctx: TerritoryContext,
  priorOutputs: StepOutputs,
  aiEnabled: boolean,
): Promise<GenerateStepResult> {
  const customIdeas = pickSanitizedGuidanceFields(priorOutputs.ad_groups).customAdGroupIdeas ?? [];
  const ruleNames = customIdeas.length
    ? customIdeas.slice(0, 3).map((idea) => titleCaseAdGroupName(idea, ctx.profile.territoryName))
    : buildRuleBasedAdGroupNames(ctx.profile);
  const ruleOutput: AdGroupsStepOutput = {
    adGroups: ruleNames.map((name) => ({ name })),
  };

  if (!aiEnabled) {
    return { output: ruleOutput, source: 'rules', aiAvailable: false };
  }

  const result = await callStructuredLlm<{ adGroups: Array<{ name: string }> }>({
    stepId: 'ad_groups',
    system: adGroupsSystemPrompt(ctx),
    user: JSON.stringify({
      territory: ctx.profile.territoryName,
      ruleBased: ruleNames,
      customGuidance: collectPromptGuidance(priorOutputs),
    }),
    schemaName: 'ad_groups',
  });

  if (!result?.data?.adGroups?.length) {
    return { output: ruleOutput, source: 'rules', aiAvailable: true };
  }

  return {
    output: { adGroups: result.data.adGroups.slice(0, 3) },
    source: 'ai',
    llmUsage: result.usage,
    aiAvailable: true,
  };
}

async function generateKeywords(
  ctx: TerritoryContext,
  priorOutputs: StepOutputs,
  aiEnabled: boolean,
): Promise<GenerateStepResult> {
  const adGroups = priorOutputs.ad_groups?.adGroups ?? buildRuleBasedAdGroupNames(ctx.profile).map((n) => ({ name: n }));
  const ruleKeywords = buildRuleBasedKeywords(ctx.profile);
  const customThemes = pickSanitizedGuidanceFields(priorOutputs.keywords).customKeywordThemes ?? [];

  const ruleOutput: KeywordsStepOutput = {
    adGroups: adGroups.map((g, i) => ({
      name: g.name,
      keywords: [
        ...ruleKeywords.slice(i * 4, i * 4 + 4),
        ...(i === 0 ? customThemes : []),
      ].slice(0, 12).map((text) => ({
        text,
        matchType: i === 0 ? ('PHRASE' as const) : ('EXACT' as const),
      })),
    })),
  };

  if (!aiEnabled) {
    return { output: ruleOutput, source: 'rules', aiAvailable: false };
  }

  const result = await callStructuredLlm<KeywordsStepOutput>({
    stepId: 'keywords',
    system: keywordsSystemPrompt(ctx),
    user: JSON.stringify({ adGroups, territory: ctx.profile, customGuidance: collectPromptGuidance(priorOutputs) }),
    schemaName: 'keywords',
  });

  if (!result?.data?.adGroups?.length) {
    return { output: ruleOutput, source: 'rules', aiAvailable: true };
  }

  return {
    output: result.data,
    source: 'ai',
    llmUsage: result.usage,
    aiAvailable: true,
  };
}

async function generateNegatives(
  ctx: TerritoryContext,
  priorOutputs: StepOutputs,
  aiEnabled: boolean,
): Promise<GenerateStepResult> {
  const occasion = priorOutputs.audience?.occasion;
  const ruleNegatives = buildDefaultNegativeKeywords({
    territory: ctx.profile.territoryName,
    occasion,
  });
  const customNegativeThemes = pickSanitizedGuidanceFields(
    priorOutputs.negative_keywords,
  ).customNegativeThemes ?? [];
  const seenRuleNegatives = new Set(ruleNegatives.map((k) => k.text.toLowerCase()));
  const customNegatives = customNegativeThemes
    .filter((theme) => !seenRuleNegatives.has(theme.toLowerCase()))
    .map((text) => ({ text, matchType: 'PHRASE' as const }));

  const ruleOutput: NegativeKeywordsStepOutput = {
    negativeKeywords: [...ruleNegatives, ...customNegatives],
  };

  if (!aiEnabled) {
    return { output: ruleOutput, source: 'rules', aiAvailable: false };
  }

  const result = await callStructuredLlm<{ suggestions: Array<{ text: string; matchType: 'PHRASE' }> }>({
    stepId: 'negative_keywords',
    system: negativesSystemPrompt(ctx),
    user: JSON.stringify({
      existing: ruleNegatives.map((k) => k.text),
      territory: ctx.profile.territoryName,
      customGuidance: collectPromptGuidance(priorOutputs),
    }),
    schemaName: 'negatives',
  });

  if (!result?.data?.suggestions?.length) {
    return { output: ruleOutput, source: 'rules', aiAvailable: true };
  }

  const seen = new Set(ruleNegatives.map((k) => k.text.toLowerCase()));
  const extras = result.data.suggestions.filter((s) => !seen.has(s.text.toLowerCase()));

  return {
    output: {
      negativeKeywords: [...ruleNegatives, ...extras.map((s) => ({ text: s.text, matchType: 'PHRASE' as const }))],
      aiSuggested: extras.map((s) => ({ text: s.text, matchType: 'PHRASE' as const })),
    },
    source: 'rules+ai',
    llmUsage: result.usage,
    aiAvailable: true,
  };
}

async function generateAdCopy(
  ctx: TerritoryContext,
  priorOutputs: StepOutputs,
  aiEnabled: boolean,
): Promise<GenerateStepResult> {
  const city = ctx.profile.territoryName;
  const adGroups = priorOutputs.ad_groups?.adGroups ?? [{ name: `Flower Delivery ${city}` }];

  const ruleOutput: AdCopyStepOutput = {
    adGroups: adGroups.map((g) => ({
      name: g.name,
      headlines: [
        `Flowers in ${city}`.slice(0, 30),
        `Fresh Bouquet Delivery`,
        `Order Flowers Online`,
        `Gift Flowers ${city}`.slice(0, 30),
        `Lanna Bloom Florist`,
      ],
      descriptions: [
        `Send fresh flowers in ${city}. Order online with local delivery.`.slice(0, 90),
        `Handcrafted bouquets for birthdays and celebrations. English checkout.`.slice(0, 90),
      ],
    })),
    dailyBudgetThb: 500,
  };

  if (!aiEnabled) {
    return { output: ruleOutput, source: 'rules', aiAvailable: false };
  }

  const result = await callStructuredLlm<{
    adGroups: Array<{ name: string; headlines: string[]; descriptions: string[] }>;
  }>({
    stepId: 'ad_copy',
    system: adCopySystemPrompt(ctx),
    user: JSON.stringify({
      adGroups,
      territory: ctx.profile,
      keywords: priorOutputs.keywords,
      landingUrl: priorOutputs.audience?.landingUrl ?? ctx.landingUrl,
      customGuidance: collectPromptGuidance(priorOutputs),
    }),
    schemaName: 'ad_copy',
  });

  if (!result?.data?.adGroups?.length) {
    return { output: ruleOutput, source: 'rules', aiAvailable: true };
  }

  return {
    output: {
      adGroups: result.data.adGroups,
      dailyBudgetThb: priorOutputs.ad_copy?.dailyBudgetThb ?? 500,
    },
    source: 'ai',
    llmUsage: result.usage,
    aiAvailable: true,
  };
}

export function mergeWizardToDraft(input: {
  outputs: StepOutputs;
  ctx: TerritoryContext;
}): { brief: CampaignBrief; draft: SearchCampaignDraft } {
  const loc = input.outputs.location!;
  const aud = input.outputs.audience!;
  const groups = input.outputs.ad_groups!.adGroups;
  const keywords = input.outputs.keywords!.adGroups;
  const negatives = input.outputs.negative_keywords!.negativeKeywords;
  const copy = input.outputs.ad_copy!;

  const brief: CampaignBrief = {
    territory: loc.territoryName,
    territoryId: loc.destinationId,
    marketSlug: loc.marketSlug ?? undefined,
    territoryGeoTargetId: input.ctx.profile.geoTargetId,
    locationTargetType: loc.locationTargetType,
    languageCode: aud.languageCode,
    landingUrl: aud.landingUrl,
    dailyBudgetThb: copy.dailyBudgetThb,
    campaignGoal: loc.customNotes,
    finalUrl: aud.landingUrl,
    occasion: aud.occasion,
    productFocus: aud.productFocus,
    applyDefaultNegatives: true,
    skipArtwork: true,
  };

  const keywordMap = new Map(keywords.map((g) => [g.name.toLowerCase(), g.keywords]));
  const copyMap = new Map(copy.adGroups.map((g) => [g.name.toLowerCase(), g]));

  const draft: SearchCampaignDraft = {
    campaignName: buildCampaignName({
      territoryName: loc.territoryName,
      locationTargetType: loc.locationTargetType,
      occasion: aud.occasion,
    }),
    campaignType: 'SEARCH',
    languageCode: 'en',
    territory: loc.territoryName,
    territoryGeoTargetId: input.ctx.profile.geoTargetId,
    locationTargetType: loc.locationTargetType,
    dailyBudgetThb: copy.dailyBudgetThb,
    biddingStrategy: 'MANUAL_CPC',
    adGroups: groups.map((g) => {
      const kw = keywordMap.get(g.name.toLowerCase()) ?? [];
      const cp = copyMap.get(g.name.toLowerCase());
      return {
        name: g.name,
        keywords: kw,
        headlines: cp?.headlines ?? [],
        descriptions: cp?.descriptions ?? [],
        finalUrl: aud.landingUrl,
      };
    }),
    negativeKeywords: negatives,
    notes: loc.customNotes,
  };

  return { brief, draft };
}

function collectPromptGuidance(outputs: StepOutputs): Record<string, string[]> {
  const fields = [
    pickSanitizedGuidanceFields(outputs.audience),
    pickSanitizedGuidanceFields(outputs.ad_groups),
    pickSanitizedGuidanceFields(outputs.keywords),
    pickSanitizedGuidanceFields(outputs.negative_keywords),
    pickSanitizedGuidanceFields(outputs.ad_copy),
  ];

  return formatGuidanceForPrompt({
    customNotes: fields.map((field) => field.customNotes).filter(Boolean).join(' / ') || undefined,
    customAudienceContexts: fields.flatMap((field) => field.customAudienceContexts ?? []),
    customOccasions: fields.flatMap((field) => field.customOccasions ?? []),
    customDeliveryContexts: fields.flatMap((field) => field.customDeliveryContexts ?? []),
    customAdGroupIdeas: fields.flatMap((field) => field.customAdGroupIdeas ?? []),
    customKeywordThemes: fields.flatMap((field) => field.customKeywordThemes ?? []),
    customNegativeThemes: fields.flatMap((field) => field.customNegativeThemes ?? []),
    copyInstructions: fields.flatMap((field) => field.copyInstructions ?? []),
  });
}

function titleCaseAdGroupName(value: string, territoryName: string): string {
  const name = value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  return name.toLowerCase().includes(territoryName.toLowerCase()) ? name : `${name} ${territoryName}`;
}
