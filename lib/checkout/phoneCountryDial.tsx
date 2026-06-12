import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';

export type CountryCodeEntry = { id: string; code: string; label: string };

/** First token of label is the flag emoji (e.g. "🇹🇭 Thailand (+66)" → "🇹🇭"). */
export function countryDialFlag(label: string): string {
  const space = label.indexOf(' ');
  return space > 0 ? label.slice(0, space) : label;
}

export function countryDialGroupLabels(lang: Locale): { popular: string; all: string } {
  return {
    popular:
      lang === 'th' ? 'ประเทศยอดนิยม' : lang === 'ru' ? 'Популярные' : 'Popular',
    all:
      lang === 'th'
        ? 'ประเทศอื่น ๆ (เรียงตามตัวอักษร)'
        : lang === 'ru'
          ? 'Все страны (A-Z)'
          : 'All countries (A-Z)',
  };
}

export function findCountryByDialCode(
  code: string,
  popular: CountryCodeEntry[],
  all: CountryCodeEntry[]
): CountryCodeEntry | undefined {
  return popular.find((c) => c.code === code) ?? all.find((c) => c.code === code);
}

/** @deprecated Use PhoneCountrySelect with popular/all props instead. */
export function renderFlagCountryCodeOptions(
  popular: CountryCodeEntry[],
  all: CountryCodeEntry[],
  lang: Locale
): ReactNode {
  const { popular: popularLabel, all: allLabel } = countryDialGroupLabels(lang);
  return (
    <>
      <optgroup label={popularLabel}>
        {popular.map((c) => (
          <option key={c.id} value={c.code} title={c.label} aria-label={c.label}>
            {countryDialFlag(c.label)}
          </option>
        ))}
      </optgroup>
      <optgroup label={allLabel}>
        {all.map((c) => (
          <option key={c.id} value={c.code} title={c.label} aria-label={c.label}>
            {countryDialFlag(c.label)}
          </option>
        ))}
      </optgroup>
    </>
  );
}
