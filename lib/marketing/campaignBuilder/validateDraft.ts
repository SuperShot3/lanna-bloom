import { CAMPAIGN_BUILDER_LIMITS } from './limits';
import { containsThaiCharacters } from './questionPlanner';
import { resolveTerritoryGeoTargetId } from './territories';
import type { CampaignBrief, CampaignValidationResult, SearchCampaignDraft, ValidationIssue } from './types';

const UNSAFE_CLAIM_PATTERNS = [
  /\bguaranteed\b/i,
  /\b100%\b/i,
  /\balways on time\b/i,
  /\blowest price\b/i,
  /\bcheapest\b/i,
];

const ALLOWED_DOMAINS = ['lannabloom.shop', 'www.lannabloom.shop', 'localhost'];

function getSiteHostname(): string {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://lannabloom.shop';
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'lannabloom.shop';
  }
}

export function isAllowedLandingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const siteHost = getSiteHostname().replace(/^www\./, '');
    if (host !== siteHost && !ALLOWED_DOMAINS.some((d) => d.replace(/^www\./, '') === host)) {
      return false;
    }
    return parsed.pathname.startsWith('/en/') || parsed.pathname === '/en';
  } catch {
    return false;
  }
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

function validateEnglishOnlyText(text: string, field: string, issues: ValidationIssue[]): void {
  if (containsThaiCharacters(text)) {
    pushIssue(issues, {
      level: 'error',
      code: 'thai_characters',
      message: `Thai characters are not allowed in ${field} for English-only campaigns.`,
      field,
    });
  }
}

function validateUnsafeClaims(text: string, field: string, issues: ValidationIssue[]): void {
  for (const pattern of UNSAFE_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      pushIssue(issues, {
        level: 'warning',
        code: 'unsafe_claim',
        message: `Review claim in ${field}: "${text}" may need site policy backing.`,
        field,
      });
    }
  }
}

export function validateCampaignBrief(brief: CampaignBrief): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!brief.territory?.trim()) {
    pushIssue(issues, { level: 'error', code: 'missing_territory', message: 'Territory is required.', field: 'territory' });
  } else if (!resolveTerritoryGeoTargetId(brief.territory)) {
    pushIssue(issues, {
      level: 'error',
      code: 'unsupported_territory',
      message: `Territory "${brief.territory}" is not in the supported geo target list.`,
      field: 'territory',
    });
  }

  if (!brief.dailyBudgetThb || brief.dailyBudgetThb <= 0) {
    pushIssue(issues, {
      level: 'error',
      code: 'missing_budget',
      message: 'Daily budget (THB) is required.',
      field: 'dailyBudgetThb',
    });
  } else if (brief.dailyBudgetThb > CAMPAIGN_BUILDER_LIMITS.maxNewCampaignDailyBudgetThb) {
    pushIssue(issues, {
      level: 'error',
      code: 'budget_too_high',
      message: `Daily budget exceeds safety limit of ${CAMPAIGN_BUILDER_LIMITS.maxNewCampaignDailyBudgetThb} THB.`,
      field: 'dailyBudgetThb',
    });
  }

  if (!brief.finalUrl?.trim()) {
    pushIssue(issues, {
      level: 'error',
      code: 'missing_final_url',
      message: 'Final URL is required.',
      field: 'finalUrl',
    });
  } else if (!isAllowedLandingUrl(brief.finalUrl)) {
    pushIssue(issues, {
      level: 'error',
      code: 'invalid_final_url',
      message: 'Final URL must be on lannabloom.shop and use an /en/... path.',
      field: 'finalUrl',
    });
  }

  return issues;
}

export function validateSearchCampaignDraft(
  draft: SearchCampaignDraft,
  options?: { dryRun?: boolean },
): CampaignValidationResult {
  const issues: ValidationIssue[] = [];

  if (draft.campaignType !== 'SEARCH') {
    pushIssue(issues, {
      level: 'error',
      code: 'unsupported_campaign_type',
      message: 'Only Search campaigns are supported in v1.',
      field: 'campaignType',
    });
  }

  if (draft.languageCode !== 'en') {
    pushIssue(issues, {
      level: 'error',
      code: 'english_only',
      message: 'Campaign language must be English (en).',
      field: 'languageCode',
    });
  }

  if (!draft.territoryGeoTargetId) {
    pushIssue(issues, {
      level: 'error',
      code: 'missing_geo_target',
      message: 'Territory geo target ID is required.',
      field: 'territoryGeoTargetId',
    });
  }

  if (draft.dailyBudgetThb > CAMPAIGN_BUILDER_LIMITS.maxNewCampaignDailyBudgetThb) {
    pushIssue(issues, {
      level: 'error',
      code: 'budget_too_high',
      message: `Daily budget exceeds ${CAMPAIGN_BUILDER_LIMITS.maxNewCampaignDailyBudgetThb} THB.`,
      field: 'dailyBudgetThb',
    });
  }

  validateEnglishOnlyText(draft.campaignName, 'campaignName', issues);

  if (draft.adGroups.length === 0) {
    pushIssue(issues, {
      level: 'error',
      code: 'no_ad_groups',
      message: 'At least one ad group is required.',
      field: 'adGroups',
    });
  }

  for (const group of draft.adGroups) {
    validateEnglishOnlyText(group.name, `adGroup:${group.name}`, issues);
    if (!isAllowedLandingUrl(group.finalUrl)) {
      pushIssue(issues, {
        level: 'error',
        code: 'invalid_ad_group_url',
        message: `Ad group "${group.name}" final URL must be /en/... on lannabloom.shop.`,
        field: `adGroups.${group.name}.finalUrl`,
      });
    }

    if (group.headlines.length < 3) {
      pushIssue(issues, {
        level: 'error',
        code: 'insufficient_headlines',
        message: `Ad group "${group.name}" needs at least 3 headlines.`,
        field: `adGroups.${group.name}.headlines`,
      });
    }

    for (const headline of group.headlines) {
      validateEnglishOnlyText(headline, 'headline', issues);
      validateUnsafeClaims(headline, 'headline', issues);
      if (headline.length > 30) {
        pushIssue(issues, {
          level: 'warning',
          code: 'headline_too_long',
          message: `Headline may be truncated: "${headline}" (${headline.length} chars).`,
          field: 'headline',
        });
      }
    }

    for (const desc of group.descriptions) {
      validateEnglishOnlyText(desc, 'description', issues);
      validateUnsafeClaims(desc, 'description', issues);
      if (desc.length > 90) {
        pushIssue(issues, {
          level: 'warning',
          code: 'description_too_long',
          message: `Description may be truncated: "${desc.slice(0, 40)}..."`,
          field: 'description',
        });
      }
    }

    for (const kw of group.keywords) {
      validateEnglishOnlyText(kw.text, 'keyword', issues);
      if (kw.matchType === 'BROAD' as string) {
        pushIssue(issues, {
          level: 'error',
          code: 'broad_match_not_allowed',
          message: `Broad match is not allowed: "${kw.text}"`,
          field: 'keyword',
        });
      }
    }
  }

  if (draft.negativeKeywords.length === 0) {
    pushIssue(issues, {
      level: 'warning',
      code: 'no_negative_keywords',
      message: 'No negative keywords — consider applying the default library.',
      field: 'negativeKeywords',
    });
  }

  const hasErrors = issues.some((i) => i.level === 'error');
  const warningCount = issues.filter((i) => i.level === 'warning').length;
  const estimatedRisk: CampaignValidationResult['estimatedRisk'] =
    hasErrors ? 'high' : warningCount >= 3 ? 'medium' : 'low';

  const dryRunResourceNames = options?.dryRun
    ? [
        'dry-run:campaignBudget',
        'dry-run:campaign',
        ...draft.adGroups.map((g) => `dry-run:adGroup:${g.name}`),
        `dry-run:negativeKeywords:${draft.negativeKeywords.length}`,
      ]
    : undefined;

  return {
    ok: !hasErrors,
    issues,
    estimatedRisk,
    dryRunResourceNames,
  };
}

export function validateFullCampaignDraft(input: {
  brief: CampaignBrief;
  draft: SearchCampaignDraft;
  dryRun?: boolean;
}): CampaignValidationResult {
  const briefIssues = validateCampaignBrief(input.brief);
  const draftResult = validateSearchCampaignDraft(input.draft, { dryRun: input.dryRun });
  const mergedIssues = [...briefIssues, ...draftResult.issues];
  const hasErrors = mergedIssues.some((i) => i.level === 'error');

  return {
    ok: !hasErrors,
    issues: mergedIssues,
    estimatedRisk: draftResult.estimatedRisk,
    dryRunResourceNames: draftResult.dryRunResourceNames,
  };
}
