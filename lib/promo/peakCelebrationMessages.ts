import { translations, type Locale } from '@/lib/i18n';
import type { PeakCelebrationRule } from '@/lib/promo/peakCelebrationPricing';

type PeakCelebrationCopy = {
  events: Record<string, string>;
  minOrderError: string;
};

function peakCopy(lang: Locale): PeakCelebrationCopy {
  const t = translations[lang] as { peakCelebration?: PeakCelebrationCopy };
  return t.peakCelebration ?? (translations.en as { peakCelebration: PeakCelebrationCopy }).peakCelebration;
}

export function peakCelebrationEventName(lang: Locale, rule: PeakCelebrationRule): string {
  const copy = peakCopy(lang);
  return copy.events[rule.nameKey] ?? copy.events[rule.id] ?? rule.nameKey;
}

export function peakCelebrationMinOrderErrorMessage(
  lang: Locale,
  rule: PeakCelebrationRule,
  remaining: number
): string {
  const copy = peakCopy(lang);
  const event = peakCelebrationEventName(lang, rule);
  return copy.minOrderError
    .replace('{event}', event)
    .replace('{min}', String(rule.minOrderThb))
    .replace('{remaining}', String(remaining));
}

export function formatPeakCelebrationTemplate(
  lang: Locale,
  template: string,
  rule: PeakCelebrationRule
): string {
  const event = peakCelebrationEventName(lang, rule);
  return template
    .replace('{event}', event)
    .replace('{start}', rule.startLabel)
    .replace('{end}', rule.endLabel)
    .replace('{markup}', String(rule.markupPercent))
    .replace('{min}', String(rule.minOrderThb));
}
