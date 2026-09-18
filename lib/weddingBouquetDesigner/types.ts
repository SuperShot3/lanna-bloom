/** Shared types + allow-lists for the wedding bouquet designer quiz. */

export const RECIPIENT_OPTIONS = [
  'bride',
  'bridesmaid',
  'motherOfBride',
  'guestTable',
  'other',
] as const;
export type RecipientOption = (typeof RECIPIENT_OPTIONS)[number];

export const STYLE_OPTIONS = [
  'classicRomantic',
  'modernMinimalist',
  'rusticBoho',
  'tropicalBeach',
  'gardenEuropean',
] as const;
export type StyleOption = (typeof STYLE_OPTIONS)[number];

export const COLOR_OPTIONS = [
  'whiteIvory',
  'blushPink',
  'red',
  'peachOrange',
  'yellow',
  'lavenderPurple',
  'burgundy',
  'greenery',
] as const;
export type ColorOption = (typeof COLOR_OPTIONS)[number];

export const MAX_COLORS = 3;

export const SIZE_OPTIONS = ['small', 'medium', 'large'] as const;
export type SizeOption = (typeof SIZE_OPTIONS)[number];

export const VENUE_OPTIONS = ['indoor', 'outdoor'] as const;
export type VenueOption = (typeof VENUE_OPTIONS)[number];

export const BUDGET_OPTIONS = ['under1500', '1500to3000', '3000to6000', 'over6000'] as const;
export type BudgetOption = (typeof BUDGET_OPTIONS)[number];

/** Hard cap on free-text fields — keeps LLM input small and prevents prompt-stuffing. */
export const FREE_TEXT_MAX_LEN = 120;

export interface WeddingBouquetAnswers {
  recipient: RecipientOption;
  style: StyleOption;
  colors: ColorOption[];
  dressColor: ColorOption | null;
  size: SizeOption;
  venue: VenueOption;
  flowersLove: string;
  flowersAvoid: string;
  budget: BudgetOption;
}

export interface WeddingBouquetResult {
  description: string;
  aiImagePrompt: string;
}
