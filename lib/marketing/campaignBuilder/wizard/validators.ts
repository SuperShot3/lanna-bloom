import { CAMPAIGN_BUILDER_LIMITS } from '../limits';
import { containsThaiCharacters } from '../questionPlanner';
import { isAllowedLandingUrl } from '../validateDraft';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { validateCustomGuidanceFields } from './customGuidance';
import { getTerritoryProfileByDestinationId } from './territoryProfiles';
import type {
  AdCopyStepOutput,
  AdGroupsStepOutput,
  AudienceStepOutput,
  KeywordsStepOutput,
  LocationStepOutput,
  NegativeKeywordsStepOutput,
  StepOutputs,
  TerritoryContext,
  WizardStepId,
} from './steps';
import type { ValidationIssue } from '../types';

const LOW_INTENT_PATTERNS = [
  /\bfree\b/i,
  /\bjob\b/i,
  /\bjobs\b/i,
  /\bwholesale\b/i,
  /\bdiy\b/i,
  /\bimages\b/i,
  /\bwallpaper\b/i,
  /\bmeaning\b/i,
  /\btutorial\b/i,
];

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bsame[- ]day\b/i,
  /\bsame day\b/i,
  /\bdelivered today\b/i,
  /\bguaranteed\b/i,
  /\b100%\b/i,
];

function push(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

export function validateTerritoryIsSupported(destinationId: string): ValidationIssue[] {
  const profile = getTerritoryProfileByDestinationId(destinationId);
  if (!profile) {
    return [
      {
        level: 'error',
        code: 'unsupported_territory',
        message: 'Territory must be selected from supported Thailand markets.',
        field: 'destinationId',
      },
    ];
  }
  return [];
}

export function validatePresenceTargeting(
  locationTargetType?: 'PRESENCE' | 'PRESENCE_OR_INTEREST',
): ValidationIssue[] {
  if (!locationTargetType) {
    return [
      {
        level: 'error',
        code: 'missing_location_target_type',
        message: 'Location targeting type is required (PRESENCE or PRESENCE_OR_INTEREST).',
        field: 'locationTargetType',
      },
    ];
  }
  return [];
}

export function validateLandingUrlMatchesTerritory(
  landingUrl: string,
  ctx: TerritoryContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isAllowedLandingUrl(landingUrl)) {
    push(issues, {
      level: 'error',
      code: 'invalid_landing_url',
      message: 'Landing URL must be on lannabloom.shop with an /en/ path.',
      field: 'landingUrl',
    });
    return issues;
  }

  const expected = ctx.landingUrl;
  if (ctx.profile.marketSlug) {
    const slug = ctx.profile.marketSlug;
    if (!landingUrl.includes(`/en/${slug}/`)) {
      push(issues, {
        level: 'error',
        code: 'landing_url_territory_mismatch',
        message: `Landing URL must match market slug "${slug}" — not another city.`,
        field: 'landingUrl',
      });
    }
  } else if (ctx.profile.destinationId === 'CHIANG_MAI') {
    if (!landingUrl.includes('/en/catalog') && !landingUrl.includes('/en/')) {
      push(issues, {
        level: 'error',
        code: 'landing_url_territory_mismatch',
        message: 'Chiang Mai campaigns should use the English catalog or Chiang Mai routes.',
        field: 'landingUrl',
      });
    }
  }

  if (landingUrl !== expected && ctx.profile.marketSlug) {
    push(issues, {
      level: 'warning',
      code: 'landing_url_not_default',
      message: `Default landing URL for this market is ${expected}.`,
      field: 'landingUrl',
    });
  }

  return issues;
}

function getWrongCityTerms(ctx: TerritoryContext): string[] {
  return ctx.profile.negativeCrossCities;
}

export function validateNoWrongCityKeywords(
  keywords: Array<{ text: string }>,
  ctx: TerritoryContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const wrongCities = getWrongCityTerms(ctx);

  for (const kw of keywords) {
    const lower = kw.text.toLowerCase();
    for (const city of wrongCities) {
      if (lower.includes(city)) {
        push(issues, {
          level: 'error',
          code: 'wrong_city_keyword',
          message: `Keyword "${kw.text}" mentions another city (${city}).`,
          field: 'keywords',
        });
      }
    }
  }
  return issues;
}

export function validateNoWrongCityAdCopy(
  texts: string[],
  ctx: TerritoryContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const wrongCities = getWrongCityTerms(ctx);

  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const city of wrongCities) {
      if (lower.includes(city)) {
        push(issues, {
          level: 'error',
          code: 'wrong_city_copy',
          message: `Ad copy mentions another city (${city}): "${text}"`,
          field: 'adCopy',
        });
      }
    }
  }
  return issues;
}

export function validateNoBroadMatchForExpansion(
  keywords: Array<{ matchType: string }>,
  ctx: TerritoryContext,
): ValidationIssue[] {
  if (ctx.profile.marketType === 'home') return [];
  const issues: ValidationIssue[] = [];
  for (const kw of keywords) {
    if (kw.matchType === 'BROAD') {
      push(issues, {
        level: 'error',
        code: 'broad_match_blocked',
        message: 'Broad match is not allowed for expansion campaigns.',
        field: 'keywords',
      });
    }
  }
  return issues;
}

export function validateKeywordIntent(keywords: Array<{ text: string }>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const kw of keywords) {
    for (const pattern of LOW_INTENT_PATTERNS) {
      if (pattern.test(kw.text)) {
        push(issues, {
          level: 'error',
          code: 'low_intent_keyword',
          message: `Low-intent keyword blocked: "${kw.text}"`,
          field: 'keywords',
        });
      }
    }
  }
  return issues;
}

export function validateAdCopyCharLimits(headlines: string[], descriptions: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const h of headlines) {
    if (h.length > 30) {
      push(issues, {
        level: 'error',
        code: 'headline_too_long',
        message: `Headline exceeds 30 characters (${h.length}): "${h}"`,
        field: 'headlines',
      });
    }
  }
  for (const d of descriptions) {
    if (d.length > 90) {
      push(issues, {
        level: 'error',
        code: 'description_too_long',
        message: `Description exceeds 90 characters (${d.length}): "${d.slice(0, 40)}..."`,
        field: 'descriptions',
      });
    }
  }
  return issues;
}

export function validateAdCopyLanguage(texts: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const text of texts) {
    if (containsThaiCharacters(text)) {
      push(issues, {
        level: 'error',
        code: 'thai_in_english_copy',
        message: `Thai characters not allowed in English copy: "${text}"`,
        field: 'adCopy',
      });
    }
  }
  return issues;
}

export function validateNoUnsupportedClaims(
  texts: string[],
  ctx: TerritoryContext,
): ValidationIssue[] {
  if (ctx.profile.deliveryBusinessRules.sameDayAllowed) return [];
  const issues: ValidationIssue[] = [];
  for (const text of texts) {
    for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
      if (pattern.test(text)) {
        push(issues, {
          level: 'error',
          code: 'unsupported_claim',
          message: `Claim not supported for this territory: "${text}"`,
          field: 'adCopy',
        });
      }
    }
  }
  return issues;
}

export function validateBudgetCap(dailyBudgetThb: number): ValidationIssue[] {
  if (!Number.isFinite(dailyBudgetThb) || dailyBudgetThb <= 0) {
    return [
      {
        level: 'error',
        code: 'missing_budget',
        message: 'Daily budget (THB) is required.',
        field: 'dailyBudgetThb',
      },
    ];
  }
  if (dailyBudgetThb > CAMPAIGN_BUILDER_LIMITS.maxNewCampaignDailyBudgetThb) {
    return [
      {
        level: 'error',
        code: 'budget_too_high',
        message: `Daily budget exceeds cap of ${CAMPAIGN_BUILDER_LIMITS.maxNewCampaignDailyBudgetThb} THB.`,
        field: 'dailyBudgetThb',
      },
    ];
  }
  return [];
}

export function validateStepOutput(
  stepId: WizardStepId,
  output: unknown,
  ctx: TerritoryContext | null,
): ValidationIssue[] {
  switch (stepId) {
    case 'location': {
      const loc = output as LocationStepOutput;
      const issues = [
        ...validateTerritoryIsSupported(loc.destinationId),
        ...validatePresenceTargeting(loc.locationTargetType),
        ...validateCustomGuidanceFields({ customNotes: loc.customNotes }, ctx),
      ];
      return issues;
    }
    case 'audience': {
      if (!ctx) {
        return [{ level: 'error', code: 'missing_context', message: 'Territory context required.' }];
      }
      const aud = output as AudienceStepOutput;
      if (aud.languageCode !== 'en') {
        return [
          {
            level: 'error',
            code: 'english_only_phase1',
            message: 'Phase 1 campaigns must use English (en).',
            field: 'languageCode',
          },
        ];
      }
      return [
        ...validateLandingUrlMatchesTerritory(aud.landingUrl, ctx),
        ...validateCustomGuidanceFields(aud, ctx),
      ];
    }
    case 'ad_groups': {
      const groups = output as AdGroupsStepOutput;
      const issues: ValidationIssue[] = [];
      if (!groups.adGroups?.length || groups.adGroups.length > 3) {
        push(issues, {
          level: 'error',
          code: 'ad_group_count',
          message: 'Ad groups must be between 1 and 3.',
          field: 'adGroups',
        });
      }
      const names = new Set<string>();
      for (const g of groups.adGroups ?? []) {
        if (!g.name?.trim()) {
          push(issues, {
            level: 'error',
            code: 'empty_ad_group',
            message: 'Ad group name is required.',
            field: 'adGroups',
          });
        }
        const key = g.name?.toLowerCase();
        if (key && names.has(key)) {
          push(issues, {
            level: 'error',
            code: 'duplicate_ad_group',
            message: `Duplicate ad group: "${g.name}"`,
            field: 'adGroups',
          });
        }
        if (key) names.add(key);
      }
      return [...issues, ...validateCustomGuidanceFields(groups, ctx)];
    }
    case 'keywords': {
      if (!ctx) {
        return [{ level: 'error', code: 'missing_context', message: 'Territory context required.' }];
      }
      const kw = output as KeywordsStepOutput;
      const allKeywords = kw.adGroups?.flatMap((g) => g.keywords ?? []) ?? [];
      if (allKeywords.length === 0) {
        return [
          {
            level: 'error',
            code: 'no_keywords',
            message: 'At least one keyword is required.',
            field: 'keywords',
          },
        ];
      }
      return [
        ...validateNoWrongCityKeywords(allKeywords, ctx),
        ...validateNoBroadMatchForExpansion(allKeywords, ctx),
        ...validateKeywordIntent(allKeywords),
        ...validateCustomGuidanceFields(kw, ctx),
        ...allKeywords.flatMap((k) =>
          containsThaiCharacters(k.text)
            ? [
                {
                  level: 'error' as const,
                  code: 'thai_in_keyword',
                  message: `Thai not allowed in keywords: "${k.text}"`,
                  field: 'keywords',
                },
              ]
            : [],
        ),
      ];
    }
    case 'negative_keywords': {
      const neg = output as NegativeKeywordsStepOutput;
      const guidanceIssues = validateCustomGuidanceFields(neg, ctx);
      if (!neg.negativeKeywords?.length) {
        return [
          {
            level: 'warning',
            code: 'no_negatives',
            message: 'No negative keywords — consider adding the default library.',
            field: 'negativeKeywords',
          },
          ...guidanceIssues,
        ];
      }
      return guidanceIssues;
    }
    case 'ad_copy': {
      if (!ctx) {
        return [{ level: 'error', code: 'missing_context', message: 'Territory context required.' }];
      }
      const copy = output as AdCopyStepOutput;
      const issues = [
        ...validateBudgetCap(copy.dailyBudgetThb),
        ...validateCustomGuidanceFields(copy, ctx),
      ];
      for (const g of copy.adGroups ?? []) {
        if (g.headlines.length < 3) {
          push(issues, {
            level: 'error',
            code: 'insufficient_headlines',
            message: `Ad group "${g.name}" needs at least 3 headlines.`,
            field: 'headlines',
          });
        }
        if (g.descriptions.length < 2) {
          push(issues, {
            level: 'error',
            code: 'insufficient_descriptions',
            message: `Ad group "${g.name}" needs at least 2 descriptions.`,
            field: 'descriptions',
          });
        }
        issues.push(
          ...validateAdCopyCharLimits(g.headlines, g.descriptions),
          ...validateAdCopyLanguage([...g.headlines, ...g.descriptions]),
          ...validateNoWrongCityAdCopy([...g.headlines, ...g.descriptions], ctx),
          ...validateNoUnsupportedClaims([...g.headlines, ...g.descriptions], ctx),
        );
      }
      return issues;
    }
    default:
      return [];
  }
}

export function stepValidationOk(issues: ValidationIssue[]): boolean {
  return !issues.some((i) => i.level === 'error');
}

export function validateAllWizardSteps(
  outputs: StepOutputs,
  ctx: TerritoryContext | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const stepId of [
    'location',
    'audience',
    'ad_groups',
    'keywords',
    'negative_keywords',
    'ad_copy',
  ] as WizardStepId[]) {
    const output = outputs[stepId];
    if (!output) {
      push(issues, {
        level: 'error',
        code: 'step_not_complete',
        message: `Step "${stepId}" is not complete.`,
        field: stepId,
      });
      continue;
    }
    issues.push(...validateStepOutput(stepId, output, ctx));
  }
  return issues;
}
