import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { TerritoryProfile } from './territoryProfiles';

export interface TerritoryContext {
  profile: TerritoryProfile;
  landingUrl: string;
  hasLocalHistory: boolean;
}

export type CustomGuidanceCategory =
  | 'market_notes'
  | 'audience_contexts'
  | 'occasions'
  | 'delivery_contexts'
  | 'ad_group_ideas'
  | 'keyword_themes'
  | 'negative_themes'
  | 'copy_instructions';

export interface CustomGuidanceLibraryItem {
  id: string;
  category: CustomGuidanceCategory;
  label: string;
  createdByAdminEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomGuidanceLibraryInput {
  category: CustomGuidanceCategory;
  label: string;
}

export interface CustomGuidanceFields {
  customNotes?: string;
  customAudienceContexts?: string[];
  customOccasions?: string[];
  customDeliveryContexts?: string[];
  customAdGroupIdeas?: string[];
  customKeywordThemes?: string[];
  customNegativeThemes?: string[];
  copyInstructions?: string[];
}

export interface LocationStepOutput {
  destinationId: DeliveryDestinationId;
  territoryName: string;
  marketSlug: string | null;
  locationTargetType: 'PRESENCE' | 'PRESENCE_OR_INTEREST';
  customNotes?: string;
}

export interface AudienceStepOutput {
  languageCode: 'en' | 'th';
  landingUrl: string;
  occasion?: string;
  productFocus?: string;
  customNotes?: string;
  customAudienceContexts?: string[];
  customOccasions?: string[];
  customDeliveryContexts?: string[];
}

export interface AdGroupStepItem {
  name: string;
}

export interface AdGroupsStepOutput {
  adGroups: AdGroupStepItem[];
  customNotes?: string;
  customAdGroupIdeas?: string[];
}

export interface KeywordStepItem {
  text: string;
  matchType: 'EXACT' | 'PHRASE';
}

export interface KeywordsStepOutput {
  adGroups: Array<AdGroupStepItem & { keywords: KeywordStepItem[] }>;
  customNotes?: string;
  customKeywordThemes?: string[];
}

export interface NegativeKeywordsStepOutput {
  negativeKeywords: KeywordStepItem[];
  aiSuggested?: KeywordStepItem[];
  customNotes?: string;
  customNegativeThemes?: string[];
}

export interface AdCopyStepOutput {
  adGroups: Array<
    AdGroupStepItem & {
      headlines: string[];
      descriptions: string[];
    }
  >;
  dailyBudgetThb: number;
  customNotes?: string;
  copyInstructions?: string[];
}

export type StepOutputMap = {
  location: LocationStepOutput;
  audience: AudienceStepOutput;
  ad_groups: AdGroupsStepOutput;
  keywords: KeywordsStepOutput;
  negative_keywords: NegativeKeywordsStepOutput;
  ad_copy: AdCopyStepOutput;
};

export type StepApprovals = Partial<
  Record<WizardStepId, { approvedAt: string; approvedBy: string }>
>;

export type StepOutputs = Partial<StepOutputMap>;

export const WIZARD_STEP_IDS = [
  'location',
  'audience',
  'ad_groups',
  'keywords',
  'negative_keywords',
  'ad_copy',
] as const;

export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export const WIZARD_STEP_ORDER: WizardStepId[] = [...WIZARD_STEP_IDS];

export const WIZARD_STEP_LABELS: Record<WizardStepId, { label: string; eyebrow: string }> = {
  location: { label: 'Location', eyebrow: 'Territory & targeting' },
  audience: { label: 'Audience', eyebrow: 'Language & landing URL' },
  ad_groups: { label: 'Ad groups', eyebrow: 'Intent buckets' },
  keywords: { label: 'Keywords', eyebrow: 'Exact & phrase' },
  negative_keywords: { label: 'Negatives', eyebrow: 'Block waste terms' },
  ad_copy: { label: 'Review & create', eyebrow: 'Copy, budget, launch' },
};

export function getNextStep(stepId: WizardStepId): WizardStepId | null {
  const idx = WIZARD_STEP_ORDER.indexOf(stepId);
  if (idx < 0 || idx >= WIZARD_STEP_ORDER.length - 1) return null;
  return WIZARD_STEP_ORDER[idx + 1]!;
}

export function getStepIndex(stepId: WizardStepId): number {
  return WIZARD_STEP_ORDER.indexOf(stepId);
}

export function isStepApproved(approvals: StepApprovals, stepId: WizardStepId): boolean {
  return Boolean(approvals[stepId]?.approvedAt);
}

export function getDownstreamSteps(fromStep: WizardStepId): WizardStepId[] {
  const idx = getStepIndex(fromStep);
  return WIZARD_STEP_ORDER.slice(idx + 1);
}

export function clearDownstreamApprovals(
  approvals: StepApprovals,
  fromStep: WizardStepId,
): StepApprovals {
  const next = { ...approvals };
  for (const step of getDownstreamSteps(fromStep)) {
    delete next[step];
  }
  return next;
}

export function clearDownstreamOutputs(outputs: StepOutputs, fromStep: WizardStepId): StepOutputs {
  const next = { ...outputs };
  for (const step of getDownstreamSteps(fromStep)) {
    delete next[step];
  }
  return next;
}

export function isWizardStepId(value: string): value is WizardStepId {
  return (WIZARD_STEP_IDS as readonly string[]).includes(value);
}

export function buildCampaignName(input: {
  territoryName: string;
  locationTargetType: 'PRESENCE' | 'PRESENCE_OR_INTEREST';
  occasion?: string;
}): string {
  const presence =
    input.locationTargetType === 'PRESENCE' ? 'Presence' : 'PresenceOrInterest';
  const focus = input.occasion?.trim() || 'Flowers';
  const month = new Date().toISOString().slice(0, 7);
  return `LB | Search | EN | ${input.territoryName} | ${presence} | ${focus} | ${month}`;
}
