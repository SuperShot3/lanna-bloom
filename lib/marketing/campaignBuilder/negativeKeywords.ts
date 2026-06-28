import type { KeywordDraft } from './types';

/** Global default negative keywords for English Search campaigns. */
export const GLOBAL_NEGATIVE_KEYWORDS: KeywordDraft[] = [
  { text: 'free', matchType: 'PHRASE' },
  { text: 'cheap', matchType: 'PHRASE' },
  { text: 'jobs', matchType: 'PHRASE' },
  { text: 'job', matchType: 'PHRASE' },
  { text: 'career', matchType: 'PHRASE' },
  { text: 'salary', matchType: 'PHRASE' },
  { text: 'hiring', matchType: 'PHRASE' },
  { text: 'wholesale', matchType: 'PHRASE' },
  { text: 'wholesaler', matchType: 'PHRASE' },
  { text: 'supplier', matchType: 'PHRASE' },
  { text: 'suppliers', matchType: 'PHRASE' },
  { text: 'factory', matchType: 'PHRASE' },
  { text: 'manufacturer', matchType: 'PHRASE' },
  { text: 'diy', matchType: 'PHRASE' },
  { text: 'how to make', matchType: 'PHRASE' },
  { text: 'tutorial', matchType: 'PHRASE' },
  { text: 'course', matchType: 'PHRASE' },
  { text: 'class', matchType: 'PHRASE' },
  { text: 'school', matchType: 'PHRASE' },
  { text: 'wikipedia', matchType: 'PHRASE' },
  { text: 'meaning', matchType: 'PHRASE' },
  { text: 'definition', matchType: 'PHRASE' },
  { text: 'images', matchType: 'PHRASE' },
  { text: 'clipart', matchType: 'PHRASE' },
  { text: 'wallpaper', matchType: 'PHRASE' },
  { text: 'png', matchType: 'PHRASE' },
  { text: 'vector', matchType: 'PHRASE' },
  { text: 'stock photo', matchType: 'PHRASE' },
  { text: 'artificial', matchType: 'PHRASE' },
  { text: 'drawing', matchType: 'PHRASE' },
  { text: 'second hand', matchType: 'PHRASE' },
  { text: 'used', matchType: 'PHRASE' },
  { text: 'rent', matchType: 'PHRASE' },
  { text: 'rental', matchType: 'PHRASE' },
];

const TERRITORY_NEGATIVES: Record<string, KeywordDraft[]> = {
  'Chiang Mai': [
    { text: 'bangkok', matchType: 'PHRASE' },
    { text: 'phuket', matchType: 'PHRASE' },
    { text: 'pattaya', matchType: 'PHRASE' },
    { text: 'krabi', matchType: 'PHRASE' },
    { text: 'samui', matchType: 'PHRASE' },
    { text: 'hua hin', matchType: 'PHRASE' },
  ],
  Phuket: [
    { text: 'bangkok', matchType: 'PHRASE' },
    { text: 'chiang mai', matchType: 'PHRASE' },
    { text: 'pattaya', matchType: 'PHRASE' },
    { text: 'krabi', matchType: 'PHRASE' },
    { text: 'samui', matchType: 'PHRASE' },
    { text: 'hua hin', matchType: 'PHRASE' },
  ],
  Pattaya: [
    { text: 'bangkok', matchType: 'PHRASE' },
    { text: 'chiang mai', matchType: 'PHRASE' },
    { text: 'phuket', matchType: 'PHRASE' },
    { text: 'krabi', matchType: 'PHRASE' },
    { text: 'samui', matchType: 'PHRASE' },
    { text: 'hua hin', matchType: 'PHRASE' },
  ],
  Krabi: [
    { text: 'bangkok', matchType: 'PHRASE' },
    { text: 'chiang mai', matchType: 'PHRASE' },
    { text: 'phuket', matchType: 'PHRASE' },
    { text: 'pattaya', matchType: 'PHRASE' },
    { text: 'samui', matchType: 'PHRASE' },
    { text: 'hua hin', matchType: 'PHRASE' },
  ],
  'Koh Samui': [
    { text: 'bangkok', matchType: 'PHRASE' },
    { text: 'chiang mai', matchType: 'PHRASE' },
    { text: 'phuket', matchType: 'PHRASE' },
    { text: 'pattaya', matchType: 'PHRASE' },
    { text: 'krabi', matchType: 'PHRASE' },
    { text: 'hua hin', matchType: 'PHRASE' },
  ],
  'Hua Hin': [
    { text: 'bangkok', matchType: 'PHRASE' },
    { text: 'chiang mai', matchType: 'PHRASE' },
    { text: 'phuket', matchType: 'PHRASE' },
    { text: 'pattaya', matchType: 'PHRASE' },
    { text: 'krabi', matchType: 'PHRASE' },
    { text: 'samui', matchType: 'PHRASE' },
  ],
  Bangkok: [
    { text: 'chiang mai', matchType: 'PHRASE' },
    { text: 'phuket', matchType: 'PHRASE' },
    { text: 'pattaya', matchType: 'PHRASE' },
    { text: 'krabi', matchType: 'PHRASE' },
    { text: 'samui', matchType: 'PHRASE' },
    { text: 'hua hin', matchType: 'PHRASE' },
  ],
};

const OCCASION_NEGATIVES: Record<string, KeywordDraft[]> = {
  birthday: [
    { text: 'wedding', matchType: 'PHRASE' },
    { text: 'funeral', matchType: 'PHRASE' },
    { text: 'sympathy', matchType: 'PHRASE' },
  ],
  wedding: [
    { text: 'funeral', matchType: 'PHRASE' },
    { text: 'sympathy', matchType: 'PHRASE' },
    { text: 'birthday', matchType: 'PHRASE' },
  ],
  sympathy: [
    { text: 'wedding', matchType: 'PHRASE' },
    { text: 'birthday', matchType: 'PHRASE' },
    { text: 'party', matchType: 'PHRASE' },
  ],
};

function dedupeKeywords(keywords: KeywordDraft[]): KeywordDraft[] {
  const seen = new Set<string>();
  const result: KeywordDraft[] = [];
  for (const kw of keywords) {
    const key = `${kw.text.toLowerCase()}|${kw.matchType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(kw);
  }
  return result;
}

export function buildDefaultNegativeKeywords(input?: {
  territory?: string;
  occasion?: string;
}): KeywordDraft[] {
  const extras: KeywordDraft[] = [...GLOBAL_NEGATIVE_KEYWORDS];

  if (input?.territory) {
    const territoryKey = Object.keys(TERRITORY_NEGATIVES).find(
      (k) => k.toLowerCase() === input.territory!.toLowerCase(),
    );
    if (territoryKey) extras.push(...TERRITORY_NEGATIVES[territoryKey]);
  }

  if (input?.occasion) {
    const occasionKey = Object.keys(OCCASION_NEGATIVES).find(
      (k) => input.occasion!.toLowerCase().includes(k),
    );
    if (occasionKey) extras.push(...OCCASION_NEGATIVES[occasionKey]);
  }

  return dedupeKeywords(extras);
}

export function getNegativeKeywordLibraryPreview(): {
  global: KeywordDraft[];
  territoryExamples: Record<string, KeywordDraft[]>;
} {
  return {
    global: GLOBAL_NEGATIVE_KEYWORDS,
    territoryExamples: TERRITORY_NEGATIVES,
  };
}
