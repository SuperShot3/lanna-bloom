import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';

export type CountryCodeEntry = { id: string; code: string; label: string };

/** First token of label is the flag emoji (e.g. "🇹🇭 Thailand (+66)" → "🇹🇭"). */
export function countryDialFlag(label: string): string {
  const space = label.indexOf(' ');
  return space > 0 ? label.slice(0, space) : label;
}

export function renderFlagCountryCodeOptions(
  popular: CountryCodeEntry[],
  all: CountryCodeEntry[],
  lang: Locale
): ReactNode {
  const popularLabel =
    lang === 'th' ? 'ประเทศยอดนิยม' : lang === 'ru' ? 'Популярные' : 'Popular';
  const allLabel =
    lang === 'th'
      ? 'ประเทศอื่น ๆ (เรียงตามตัวอักษร)'
      : lang === 'ru'
        ? 'Все страны (A-Z)'
        : 'All countries (A-Z)';
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
