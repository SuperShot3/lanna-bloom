import type { CampaignBrief, FollowUpQuestion } from './types';
import { listSupportedTerritories } from './territories';

const THAI_CHAR_PATTERN = /[\u0E00-\u0E7F]/;

export function containsThaiCharacters(text: string): boolean {
  return THAI_CHAR_PATTERN.test(text);
}

function parseBudgetFromText(text: string): number | null {
  const match = text.match(/(\d[\d,]*)\s*(?:thb|baht|฿)?/i);
  if (!match) return null;
  const n = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectTerritory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const territory of listSupportedTerritories()) {
    if (lower.includes(territory.toLowerCase())) return territory;
  }
  if (lower.includes('phuket')) return 'Phuket';
  if (lower.includes('bangkok') || lower.includes('bkk')) return 'Bangkok';
  if (lower.includes('chiang mai') || lower.includes('chiangmai')) return 'Chiang Mai';
  if (lower.includes('pattaya')) return 'Pattaya';
  return null;
}

function detectUrl(text: string): string | null {
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) return urlMatch[0].replace(/[.,;]+$/, '');
  const pathMatch = text.match(/\/en\/[a-z0-9\-_/]+/i);
  if (pathMatch) {
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://lannabloom.shop';
    return `${base}${pathMatch[0]}`;
  }
  return null;
}

export function extractHintsFromPrompt(prompt: string): Partial<CampaignBrief> {
  const hints: Partial<CampaignBrief> = {};
  const territory = detectTerritory(prompt);
  if (territory) hints.territory = territory;

  const budget = parseBudgetFromText(prompt);
  if (budget) hints.dailyBudgetThb = budget;

  const url = detectUrl(prompt);
  if (url) hints.finalUrl = url;

  const lower = prompt.toLowerCase();
  if (lower.includes('birthday')) hints.occasion = 'birthday';
  else if (lower.includes('wedding')) hints.occasion = 'wedding';
  else if (lower.includes('sympathy') || lower.includes('funeral')) hints.occasion = 'sympathy';
  else if (lower.includes('anniversary')) hints.occasion = 'anniversary';

  if (lower.includes('same day') || lower.includes('same-day')) {
    hints.productFocus = 'same-day delivery';
  }

  return hints;
}

export function planFollowUpQuestions(input: {
  prompt: string;
  answers?: Record<string, unknown>;
}): FollowUpQuestion[] {
  const hints = extractHintsFromPrompt(input.prompt);
  const answers = input.answers ?? {};
  const questions: FollowUpQuestion[] = [];

  if (!hints.territory && !answers.territory) {
    questions.push({
      id: 'territory',
      field: 'territory',
      question: 'Which city or territory should this English Search campaign target?',
      type: 'select',
      options: listSupportedTerritories(),
      required: true,
    });
  }

  if (!hints.dailyBudgetThb && !answers.dailyBudgetThb) {
    questions.push({
      id: 'dailyBudgetThb',
      field: 'dailyBudgetThb',
      question: 'What daily budget (THB) should we set for this campaign?',
      type: 'number',
      required: true,
    });
  }

  if (!hints.finalUrl && !answers.finalUrl) {
    questions.push({
      id: 'finalUrl',
      field: 'finalUrl',
      question: 'Which English landing page on lannabloom.shop should traffic go to? (must be /en/...)',
      type: 'url',
      required: true,
    });
  }

  if (!hints.occasion && !answers.occasion && !answers.productFocus) {
    questions.push({
      id: 'occasion',
      field: 'occasion',
      question: 'Which product or occasion is the main focus? (e.g. birthday flowers, same-day delivery)',
      type: 'text',
      required: false,
    });
  }

  if (answers.applyDefaultNegatives === undefined) {
    questions.push({
      id: 'applyDefaultNegatives',
      field: 'applyDefaultNegatives',
      question: 'Apply the default negative keyword library to this campaign?',
      type: 'boolean',
      required: false,
    });
  }

  if (answers.skipArtwork === undefined) {
    questions.push({
      id: 'skipArtwork',
      field: 'skipArtwork',
      question: 'Skip image assets for now? (Search campaigns can run text-only)',
      type: 'boolean',
      required: false,
    });
  }

  return questions.slice(0, 6);
}

export function mergeBriefFromAnswers(input: {
  prompt: string;
  answers?: Record<string, unknown>;
}): CampaignBrief {
  const hints = extractHintsFromPrompt(input.prompt);
  const answers = input.answers ?? {};

  const territory = String(answers.territory ?? hints.territory ?? '').trim();
  const dailyBudgetThb = Number(answers.dailyBudgetThb ?? hints.dailyBudgetThb);
  const finalUrl = String(answers.finalUrl ?? hints.finalUrl ?? '').trim();
  const occasion = answers.occasion ? String(answers.occasion) : hints.occasion;
  const productFocus = answers.productFocus ? String(answers.productFocus) : hints.productFocus;

  return {
    territory,
    dailyBudgetThb,
    finalUrl,
    occasion: occasion || undefined,
    productFocus: productFocus || undefined,
    campaignGoal: answers.campaignGoal ? String(answers.campaignGoal) : undefined,
    startDate: answers.startDate ? String(answers.startDate) : undefined,
    endDate: answers.endDate ? String(answers.endDate) : undefined,
    applyDefaultNegatives: answers.applyDefaultNegatives !== false,
    skipArtwork: answers.skipArtwork !== false,
  };
}
