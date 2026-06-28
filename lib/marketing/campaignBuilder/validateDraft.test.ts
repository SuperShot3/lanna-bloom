/**
 * Campaign Builder validation tests.
 * Run with: npx tsx lib/marketing/campaignBuilder/validateDraft.test.ts
 */

import { buildDefaultNegativeKeywords } from './negativeKeywords';
import { planFollowUpQuestions, containsThaiCharacters, extractHintsFromPrompt } from './questionPlanner';
import { resolveTerritoryGeoTargetId } from './territories';
import { validateCampaignBrief, validateSearchCampaignDraft, isAllowedLandingUrl } from './validateDraft';
import type { CampaignBrief, SearchCampaignDraft } from './types';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// Thai character detection
assert(!containsThaiCharacters('flower delivery Chiang Mai'), 'English text passes');
assert(containsThaiCharacters('ดอกไม้'), 'Thai text detected');

// Territory geo targets
assert(resolveTerritoryGeoTargetId('Chiang Mai') === 1012728, 'Chiang Mai geo ID');
assert(resolveTerritoryGeoTargetId('Unknown City') === null, 'Unknown territory returns null');

// Negative keyword library
const negatives = buildDefaultNegativeKeywords({ territory: 'Phuket', occasion: 'birthday' });
assert(negatives.length >= 30, 'Default negatives include global list');
assert(negatives.some((k) => k.text === 'free'), 'Includes global negative');
assert(negatives.some((k) => k.text === 'bangkok'), 'Includes territory negative for Phuket');

// Question planner
const questions = planFollowUpQuestions({
  prompt: 'Launch birthday flowers campaign',
});
assert(questions.length > 0, 'Missing details trigger questions');
assert(questions.some((q) => q.field === 'territory'), 'Asks for territory');

const hints = extractHintsFromPrompt(
  'Launch search campaign for flower delivery in Phuket with 500 THB per day, focus on birthday flowers',
);
assert(hints.territory === 'Phuket', 'Detects Phuket');
assert(hints.dailyBudgetThb === 500, 'Detects budget');
assert(hints.occasion === 'birthday', 'Detects occasion');

// Landing URL validation
assert(isAllowedLandingUrl('https://lannabloom.shop/en/catalog'), 'Valid /en/ URL');
assert(!isAllowedLandingUrl('https://lannabloom.shop/th/catalog'), 'Rejects Thai path');
assert(!isAllowedLandingUrl('https://example.com/en/catalog'), 'Rejects external domain');

// Brief validation
const validBrief: CampaignBrief = {
  territory: 'Chiang Mai',
  dailyBudgetThb: 500,
  finalUrl: 'https://lannabloom.shop/en/catalog',
  applyDefaultNegatives: true,
  skipArtwork: true,
};
const briefIssues = validateCampaignBrief(validBrief);
assert(briefIssues.length === 0, 'Valid brief has no issues');

const overBudgetBrief: CampaignBrief = {
  ...validBrief,
  dailyBudgetThb: 99999,
};
assert(
  validateCampaignBrief(overBudgetBrief).some((i) => i.code === 'budget_too_high'),
  'Rejects over-budget',
);

// Draft validation
const validDraft: SearchCampaignDraft = {
  campaignName: 'EN Search | Chiang Mai | birthday',
  campaignType: 'SEARCH',
  languageCode: 'en',
  territory: 'Chiang Mai',
  territoryGeoTargetId: 1012728,
  dailyBudgetThb: 500,
  biddingStrategy: 'MANUAL_CPC',
  adGroups: [
    {
      name: 'Core delivery',
      keywords: [{ text: 'flower delivery Chiang Mai', matchType: 'PHRASE' }],
      headlines: ['Flower Delivery Chiang Mai', 'Fresh Bouquets', 'Order Online'],
      descriptions: ['Send flowers in Chiang Mai.', 'English checkout available.'],
      finalUrl: 'https://lannabloom.shop/en/catalog',
    },
  ],
  negativeKeywords: buildDefaultNegativeKeywords({ territory: 'Chiang Mai' }),
};

const draftResult = validateSearchCampaignDraft(validDraft, { dryRun: true });
assert(draftResult.ok, 'Valid draft passes validation');
assert(draftResult.dryRunResourceNames != null, 'Dry run returns resource names');

const thaiDraft: SearchCampaignDraft = {
  ...validDraft,
  campaignName: 'ดอกไม้ delivery',
};
const thaiResult = validateSearchCampaignDraft(thaiDraft);
assert(!thaiResult.ok, 'Rejects Thai in campaign name');
assert(thaiResult.issues.some((i) => i.code === 'thai_characters'), 'Thai character issue reported');

console.log('✓ All campaign builder validation assertions passed');
process.exit(0);
