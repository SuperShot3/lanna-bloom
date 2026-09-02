import { translations, type Locale } from '@/lib/i18n';

export type HeroTrustTiming = 'same_day' | 'next_day' | 'preorder_only' | 'other';

export function buildHeroTrustLine(params: {
  lang: Locale;
  city: string;
  timing: HeroTrustTiming;
}): string {
  const t = translations[params.lang].hero;
  const template =
    params.timing === 'same_day'
      ? t.trustLine
      : params.timing === 'next_day'
        ? t.trustLineNextDay
        : t.trustLineGeneric;
  return template.replaceAll('{city}', params.city);
}
