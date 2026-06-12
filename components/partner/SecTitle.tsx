'use client';

import type { Locale } from '@/lib/i18n';

type SecTitleProps = {
  th: string;
  en: string;
  lang: Locale;
};

export function SecTitle({ th, en, lang }: SecTitleProps) {
  return (
    <div className="partner-sec-title">
      <div className="partner-sec-title-th">{lang === 'th' ? th : en}</div>
    </div>
  );
}
