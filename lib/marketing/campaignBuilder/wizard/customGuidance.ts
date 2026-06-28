import { containsThaiCharacters } from '../questionPlanner';
import type { ValidationIssue } from '../types';
import type {
  CustomGuidanceCategory,
  CustomGuidanceFields,
  TerritoryContext,
} from './steps';

export const CUSTOM_GUIDANCE_CATEGORIES: CustomGuidanceCategory[] = [
  'market_notes',
  'audience_contexts',
  'occasions',
  'delivery_contexts',
  'ad_group_ideas',
  'keyword_themes',
  'negative_themes',
  'copy_instructions',
];

export const MAX_CUSTOM_GUIDANCE_TAGS = 8;
export const MAX_CUSTOM_GUIDANCE_TAG_LENGTH = 48;
export const MAX_CUSTOM_GUIDANCE_NOTE_LENGTH = 240;

const LOW_INTENT_PATTERNS = [
  /\bfree\b/i,
  /\bjob\b/i,
  /\bjobs\b/i,
  /\bwholesale\b/i,
  /\bdiy\b/i,
  /\bimages\b/i,
  /\bdrawing\b/i,
  /\bwallpaper\b/i,
  /\bmeaning\b/i,
  /\btutorial\b/i,
];

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bsame[- ]day\b/i,
  /\bdelivered today\b/i,
  /\bguaranteed\b/i,
  /\b100%\b/i,
];

const AVOIDANCE_PATTERN = /\b(avoid|exclude|no|not|never|without|do not|don't|dont)\b/i;

export function isCustomGuidanceCategory(value: string): value is CustomGuidanceCategory {
  return (CUSTOM_GUIDANCE_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeCustomGuidanceText(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCustomGuidanceKey(value: string): string {
  return normalizeCustomGuidanceText(value).toLowerCase();
}

export function sanitizeCustomGuidanceTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const label = normalizeCustomGuidanceText(raw).slice(0, MAX_CUSTOM_GUIDANCE_TAG_LENGTH);
    const key = normalizeCustomGuidanceKey(label);
    if (!label || seen.has(key)) continue;
    seen.add(key);
    sanitized.push(label);
    if (sanitized.length >= MAX_CUSTOM_GUIDANCE_TAGS) break;
  }

  return sanitized;
}

export function sanitizeCustomGuidanceNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const note = normalizeCustomGuidanceText(value).slice(0, MAX_CUSTOM_GUIDANCE_NOTE_LENGTH);
  return note || undefined;
}

export function sanitizeGuidanceFields<T extends CustomGuidanceFields>(fields: T): T {
  return {
    ...fields,
    customNotes: sanitizeCustomGuidanceNote(fields.customNotes),
    customAudienceContexts: sanitizeCustomGuidanceTags(fields.customAudienceContexts),
    customOccasions: sanitizeCustomGuidanceTags(fields.customOccasions),
    customDeliveryContexts: sanitizeCustomGuidanceTags(fields.customDeliveryContexts),
    customAdGroupIdeas: sanitizeCustomGuidanceTags(fields.customAdGroupIdeas),
    customKeywordThemes: sanitizeCustomGuidanceTags(fields.customKeywordThemes),
    customNegativeThemes: sanitizeCustomGuidanceTags(fields.customNegativeThemes),
    copyInstructions: sanitizeCustomGuidanceTags(fields.copyInstructions),
  };
}

export function pickSanitizedGuidanceFields(value: unknown): CustomGuidanceFields {
  const fields = (value && typeof value === 'object' ? value : {}) as CustomGuidanceFields;
  return sanitizeGuidanceFields({
    customNotes: fields.customNotes,
    customAudienceContexts: fields.customAudienceContexts,
    customOccasions: fields.customOccasions,
    customDeliveryContexts: fields.customDeliveryContexts,
    customAdGroupIdeas: fields.customAdGroupIdeas,
    customKeywordThemes: fields.customKeywordThemes,
    customNegativeThemes: fields.customNegativeThemes,
    copyInstructions: fields.copyInstructions,
  });
}

function addGuidanceIssues(input: {
  issues: ValidationIssue[];
  field: string;
  label: string;
  values: string[];
  ctx: TerritoryContext | null;
  allowLowIntent?: boolean;
  allowWrongCity?: boolean;
  allowUnsupportedClaimAvoidance?: boolean;
}): void {
  const {
    issues,
    field,
    label,
    values,
    ctx,
    allowLowIntent,
    allowWrongCity,
    allowUnsupportedClaimAvoidance,
  } = input;

  if (values.length > MAX_CUSTOM_GUIDANCE_TAGS) {
    issues.push({
      level: 'error',
      code: 'too_many_custom_guidance_tags',
      message: `${label} can include at most ${MAX_CUSTOM_GUIDANCE_TAGS} custom tags.`,
      field,
    });
  }

  for (const value of values) {
    if (value.length > MAX_CUSTOM_GUIDANCE_TAG_LENGTH) {
      issues.push({
        level: 'error',
        code: 'custom_guidance_tag_too_long',
        message: `${label} tag is too long: "${value}"`,
        field,
      });
    }

    if (containsThaiCharacters(value)) {
      issues.push({
        level: 'error',
        code: 'thai_in_custom_guidance',
        message: `Thai characters are not allowed in ${label}: "${value}"`,
        field,
      });
    }

    if (!allowLowIntent) {
      for (const pattern of LOW_INTENT_PATTERNS) {
        if (pattern.test(value)) {
          issues.push({
            level: 'error',
            code: 'low_intent_custom_guidance',
            message: `Low-intent custom guidance blocked: "${value}"`,
            field,
          });
        }
      }
    }

    if (ctx && !allowWrongCity) {
      const lower = value.toLowerCase();
      for (const city of ctx.profile.negativeCrossCities) {
        if (lower.includes(city)) {
          issues.push({
            level: 'error',
            code: 'wrong_city_custom_guidance',
            message: `Custom guidance "${value}" mentions another city (${city}).`,
            field,
          });
        }
      }
    }

    if (ctx && !ctx.profile.deliveryBusinessRules.sameDayAllowed) {
      for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
        if (pattern.test(value) && !(allowUnsupportedClaimAvoidance && AVOIDANCE_PATTERN.test(value))) {
          issues.push({
            level: 'error',
            code: 'unsupported_claim_custom_guidance',
            message: `Custom guidance contains an unsupported delivery claim: "${value}"`,
            field,
          });
        }
      }
    }
  }
}

export function validateCustomGuidanceFields(
  fields: CustomGuidanceFields,
  ctx: TerritoryContext | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (fields.customNotes && fields.customNotes.length > MAX_CUSTOM_GUIDANCE_NOTE_LENGTH) {
    issues.push({
      level: 'error',
      code: 'custom_guidance_note_too_long',
      message: `Custom note can be at most ${MAX_CUSTOM_GUIDANCE_NOTE_LENGTH} characters.`,
      field: 'customNotes',
    });
  }

  addGuidanceIssues({
    issues,
    field: 'customNotes',
    label: 'custom note',
    values: fields.customNotes ? [fields.customNotes] : [],
    ctx,
    allowLowIntent: true,
    allowUnsupportedClaimAvoidance: true,
  });

  addGuidanceIssues({
    issues,
    field: 'customAudienceContexts',
    label: 'audience guidance',
    values: fields.customAudienceContexts ?? [],
    ctx,
  });
  addGuidanceIssues({
    issues,
    field: 'customOccasions',
    label: 'occasion guidance',
    values: fields.customOccasions ?? [],
    ctx,
  });
  addGuidanceIssues({
    issues,
    field: 'customDeliveryContexts',
    label: 'delivery-place guidance',
    values: fields.customDeliveryContexts ?? [],
    ctx,
  });
  addGuidanceIssues({
    issues,
    field: 'customAdGroupIdeas',
    label: 'ad group guidance',
    values: fields.customAdGroupIdeas ?? [],
    ctx,
  });
  addGuidanceIssues({
    issues,
    field: 'customKeywordThemes',
    label: 'keyword guidance',
    values: fields.customKeywordThemes ?? [],
    ctx,
  });
  addGuidanceIssues({
    issues,
    field: 'customNegativeThemes',
    label: 'negative keyword guidance',
    values: fields.customNegativeThemes ?? [],
    ctx,
    allowLowIntent: true,
    allowWrongCity: true,
    allowUnsupportedClaimAvoidance: true,
  });
  addGuidanceIssues({
    issues,
    field: 'copyInstructions',
    label: 'copy guidance',
    values: fields.copyInstructions ?? [],
    ctx,
    allowUnsupportedClaimAvoidance: true,
  });

  return issues;
}

export function formatGuidanceForPrompt(outputs: CustomGuidanceFields): Record<string, string[]> {
  return {
    notes: outputs.customNotes ? [outputs.customNotes] : [],
    audienceContexts: outputs.customAudienceContexts ?? [],
    occasions: outputs.customOccasions ?? [],
    deliveryContexts: outputs.customDeliveryContexts ?? [],
    adGroupIdeas: outputs.customAdGroupIdeas ?? [],
    keywordThemes: outputs.customKeywordThemes ?? [],
    negativeThemes: outputs.customNegativeThemes ?? [],
    copyInstructions: outputs.copyInstructions ?? [],
  };
}
