import 'server-only';

import {
  BUDGET_OPTIONS,
  COLOR_OPTIONS,
  FREE_TEXT_MAX_LEN,
  MAX_COLORS,
  RECIPIENT_OPTIONS,
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  VENUE_OPTIONS,
  type WeddingBouquetAnswers,
} from './types';

function clipFreeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, FREE_TEXT_MAX_LEN);
}

export function validateWeddingBouquetAnswers(
  input: unknown
): { ok: true; data: WeddingBouquetAnswers } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Invalid request body.' };
  }
  const b = input as Record<string, unknown>;

  const recipient = RECIPIENT_OPTIONS.find((o) => o === b.recipient);
  if (!recipient) return { ok: false, message: 'Please choose who this bouquet is for.' };

  const style = STYLE_OPTIONS.find((o) => o === b.style);
  if (!style) return { ok: false, message: 'Please choose a wedding style.' };

  const colorsRaw = Array.isArray(b.colors) ? b.colors : [];
  const colors = COLOR_OPTIONS.filter((o) => colorsRaw.includes(o)).slice(0, MAX_COLORS);
  if (colors.length === 0) return { ok: false, message: 'Please choose at least one color.' };

  const dressColorRaw = COLOR_OPTIONS.find((o) => o === b.dressColor);
  const dressColor = dressColorRaw ?? null;

  const size = SIZE_OPTIONS.find((o) => o === b.size);
  if (!size) return { ok: false, message: 'Please choose a bouquet size.' };

  const venue = VENUE_OPTIONS.find((o) => o === b.venue);
  if (!venue) return { ok: false, message: 'Please choose indoor or outdoor.' };

  const budget = BUDGET_OPTIONS.find((o) => o === b.budget);
  if (!budget) return { ok: false, message: 'Please choose a budget range.' };

  const flowersLove = clipFreeText(b.flowersLove);
  const flowersAvoid = clipFreeText(b.flowersAvoid);

  return {
    ok: true,
    data: { recipient, style, colors, dressColor, size, venue, flowersLove, flowersAvoid, budget },
  };
}
