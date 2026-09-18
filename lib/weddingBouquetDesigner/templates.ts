import type { WeddingBouquetAnswers } from './types';

/** Minimal shape this module needs from translations[lang].weddingBouquetDesigner. */
export type WeddingBouquetDesignerCopy = Record<string, string>;

/** Option id -> i18n key, exported so the quiz UI can render consistent labels. */
export const RECIPIENT_KEY: Record<WeddingBouquetAnswers['recipient'], string> = {
  bride: 'recipientBride',
  bridesmaid: 'recipientBridesmaid',
  motherOfBride: 'recipientMotherOfBride',
  guestTable: 'recipientGuestTable',
  other: 'recipientOther',
};

export const STYLE_KEY: Record<WeddingBouquetAnswers['style'], string> = {
  classicRomantic: 'styleClassicRomantic',
  modernMinimalist: 'styleModernMinimalist',
  rusticBoho: 'styleRusticBoho',
  tropicalBeach: 'styleTropicalBeach',
  gardenEuropean: 'styleGardenEuropean',
};

export const STYLE_DESC_KEY: Record<WeddingBouquetAnswers['style'], string> = {
  classicRomantic: 'styleClassicRomanticDesc',
  modernMinimalist: 'styleModernMinimalistDesc',
  rusticBoho: 'styleRusticBohoDesc',
  tropicalBeach: 'styleTropicalBeachDesc',
  gardenEuropean: 'styleGardenEuropeanDesc',
};

export const COLOR_KEY: Record<string, string> = {
  whiteIvory: 'colorWhiteIvory',
  blushPink: 'colorBlushPink',
  red: 'colorRed',
  peachOrange: 'colorPeachOrange',
  yellow: 'colorYellow',
  lavenderPurple: 'colorLavenderPurple',
  burgundy: 'colorBurgundy',
  greenery: 'colorGreenery',
};

export const SIZE_KEY: Record<WeddingBouquetAnswers['size'], string> = {
  small: 'sizeSmall',
  medium: 'sizeMedium',
  large: 'sizeLarge',
};

export const SIZE_DESC_KEY: Record<WeddingBouquetAnswers['size'], string> = {
  small: 'sizeSmallDesc',
  medium: 'sizeMediumDesc',
  large: 'sizeLargeDesc',
};

export const VENUE_KEY: Record<WeddingBouquetAnswers['venue'], string> = {
  indoor: 'venueIndoor',
  outdoor: 'venueOutdoor',
};

export const BUDGET_KEY: Record<WeddingBouquetAnswers['budget'], string> = {
  under1500: 'budgetUnder1500',
  '1500to3000': 'budget1500to3000',
  '3000to6000': 'budget3000to6000',
  over6000: 'budgetOver6000',
};

export function label(t: WeddingBouquetDesignerCopy, key: string): string {
  return t[key] ?? key;
}

function colorLabels(t: WeddingBouquetDesignerCopy, colors: string[]): string[] {
  return colors.map((c) => label(t, COLOR_KEY[c] ?? c));
}

/**
 * Pure client-safe fallback used only when the LLM call is unavailable
 * (missing OPENAI_API_KEY or a failed request) so the page never dead-ends.
 */
export function buildBouquetDescriptionFallback(
  answers: WeddingBouquetAnswers,
  t: WeddingBouquetDesignerCopy
): string {
  const style = label(t, STYLE_KEY[answers.style]);
  const venue = label(t, VENUE_KEY[answers.venue]).toLowerCase();
  const colors = colorLabels(t, answers.colors).join(', ').toLowerCase();
  const recipient = label(t, RECIPIENT_KEY[answers.recipient]).toLowerCase();

  const sentences = [
    `${label(t, SIZE_KEY[answers.size])} ${style.toLowerCase()} bouquet for ${recipient}, in ${colors} tones.`,
    `Best suited to an ${venue} wedding.`,
  ];
  if (answers.flowersLove) sentences.push(`Loves: ${answers.flowersLove}.`);
  if (answers.flowersAvoid) sentences.push(`Avoid: ${answers.flowersAvoid}.`);
  return sentences.join(' ');
}

export function buildAiImagePromptFallback(
  answers: WeddingBouquetAnswers,
  t: WeddingBouquetDesignerCopy
): string {
  const style = label(t, STYLE_KEY[answers.style]);
  const size = label(t, SIZE_KEY[answers.size]);
  const venue = label(t, VENUE_KEY[answers.venue]);
  const colors = colorLabels(t, answers.colors).join(' and ');
  const parts = [
    `A professional studio photo of a ${size.toLowerCase()} ${style.toLowerCase()} wedding bouquet`,
    `in ${colors} colors, hand-tied, fresh flowers, soft natural light,`,
    `styled for an ${venue.toLowerCase()} wedding.`,
  ];
  if (answers.flowersLove) parts.push(`Include: ${answers.flowersLove}.`);
  if (answers.flowersAvoid) parts.push(`Avoid: ${answers.flowersAvoid}.`);
  parts.push('Elegant, romantic, high detail, shallow depth of field.');
  return parts.join(' ');
}

/** Plain-text summary sent to the florist via WhatsApp when the visitor taps the CTA. */
export function buildWhatsAppLeadMessage(
  answers: WeddingBouquetAnswers,
  description: string,
  t: WeddingBouquetDesignerCopy,
  subjectLine: string
): string {
  const lines = [
    subjectLine,
    '',
    description,
    '',
    `${label(t, 'descriptionLabel')}:`,
    `- ${label(t, RECIPIENT_KEY[answers.recipient])}`,
    `- ${label(t, STYLE_KEY[answers.style])}`,
    `- ${colorLabels(t, answers.colors).join(', ')}`,
    `- ${label(t, SIZE_KEY[answers.size])}, ${label(t, VENUE_KEY[answers.venue])}`,
    `- ${label(t, BUDGET_KEY[answers.budget])}`,
  ];
  if (answers.flowersLove) lines.push(`- ${answers.flowersLove}`);
  if (answers.flowersAvoid) lines.push(`- ${label(t, 'flowersAvoidLabel')}: ${answers.flowersAvoid}`);
  return lines.join('\n');
}
