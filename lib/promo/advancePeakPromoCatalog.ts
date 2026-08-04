/**
 * Dispatcher for advance-peak celebration promo codes (MOM10, LOVE10, WOMEN10, NY10).
 */

import {
  advancePeakPromoDiscount,
  evaluateAdvancePeakPromo,
  isAdvancePeakPromoActive,
  type AdvancePeakPromoConfig,
  type AdvancePeakPromoEligibility,
  type AdvancePeakPromoIneligibleReason,
} from '@/lib/promo/advancePeakPromo';
import { MOTHERS_DAY_2026_PROMO_CONFIG } from '@/lib/promo/mothersDay2026Promo';
import { VALENTINES_2027_PROMO_CONFIG } from '@/lib/promo/valentines2027Promo';
import { WOMENS_DAY_2027_PROMO_CONFIG } from '@/lib/promo/womensDay2027Promo';
import { NEW_YEAR_2026_PROMO_CONFIG } from '@/lib/promo/newYear2026Promo';

export type { AdvancePeakPromoIneligibleReason, AdvancePeakPromoEligibility };

/** Banner / i18n key under translations[lang].* */
export type AdvancePeakPromoI18nKey =
  | 'mothersDay2026Promo'
  | 'valentines2027Promo'
  | 'womensDay2027Promo'
  | 'newYear2026Promo';

export type AdvancePeakPromoDefinition = {
  config: AdvancePeakPromoConfig;
  i18nKey: AdvancePeakPromoI18nKey;
  /** Cart ineligible message key prefix (e.g. mom10 → mom10BelowMinimum). */
  messagePrefix: 'mom10' | 'love10' | 'women10' | 'ny10';
};

export const ADVANCE_PEAK_PROMOS: AdvancePeakPromoDefinition[] = [
  { config: MOTHERS_DAY_2026_PROMO_CONFIG, i18nKey: 'mothersDay2026Promo', messagePrefix: 'mom10' },
  { config: NEW_YEAR_2026_PROMO_CONFIG, i18nKey: 'newYear2026Promo', messagePrefix: 'ny10' },
  { config: VALENTINES_2027_PROMO_CONFIG, i18nKey: 'valentines2027Promo', messagePrefix: 'love10' },
  { config: WOMENS_DAY_2027_PROMO_CONFIG, i18nKey: 'womensDay2027Promo', messagePrefix: 'women10' },
];

export function findAdvancePeakPromoByCode(
  code: string | null | undefined
): AdvancePeakPromoDefinition | null {
  const normalized = code?.trim().toUpperCase() ?? '';
  if (!normalized) return null;
  return ADVANCE_PEAK_PROMOS.find((p) => p.config.code === normalized) ?? null;
}

export function isAdvancePeakCelebrationPromoCode(code: string | null | undefined): boolean {
  return findAdvancePeakPromoByCode(code) != null;
}

/** First promo whose advance-order window is active today (at most one overlaps). */
export function getActiveAdvancePeakPromo(now: Date = new Date()): AdvancePeakPromoDefinition | null {
  for (const promo of ADVANCE_PEAK_PROMOS) {
    if (isAdvancePeakPromoActive(promo.config, now)) return promo;
  }
  return null;
}

export function evaluateAdvancePeakCelebrationPromo(
  code: string,
  itemsTotal: number,
  options: { now?: Date; deliveryDateYmd?: string | null } = {}
): AdvancePeakPromoEligibility | null {
  const promo = findAdvancePeakPromoByCode(code);
  if (!promo) return null;
  return evaluateAdvancePeakPromo(promo.config, itemsTotal, options);
}

export function advancePeakCelebrationPromoDiscount(
  code: string,
  itemsTotal: number,
  now: Date = new Date(),
  deliveryDateYmd?: string | null
): number | null {
  const promo = findAdvancePeakPromoByCode(code);
  if (!promo) return null;
  return advancePeakPromoDiscount(promo.config, itemsTotal, now, deliveryDateYmd);
}
