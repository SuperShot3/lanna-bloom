/**
 * Shared helpers for the homepage landing sections.
 * Same-day cutoff / delivery window copy is resolved from lib/deliveryHours
 * constants so the times are never hard-coded twice.
 */
import { translations, type Locale } from '@/lib/i18n';
import {
  SAME_DAY_ORDER_CUTOFF_MIN,
  DELIVERY_WINDOW_START_MIN,
  DELIVERY_WINDOW_END_MIN,
  formatMinutesAsClockTime,
} from '@/lib/deliveryHours';

export function fillDeliveryTimePlaceholders(text: string): string {
  return text
    .replace('{cutoff}', formatMinutesAsClockTime(SAME_DAY_ORDER_CUTOFF_MIN))
    .replace('{start}', formatMinutesAsClockTime(DELIVERY_WINDOW_START_MIN))
    .replace('{end}', formatMinutesAsClockTime(DELIVERY_WINDOW_END_MIN));
}

export type HomeFaqItem = { q: string; a: string };

/** FAQ entries with delivery times resolved — used by both the FAQ section and FAQPage JSON-LD. */
export function getHomeFaqItems(lang: Locale): HomeFaqItem[] {
  const faq = translations[lang].homeLanding.faq;
  return faq.items.map((item) => ({
    q: item.q,
    a: fillDeliveryTimePlaceholders(item.a),
  }));
}
