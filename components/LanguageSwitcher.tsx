'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { trackLanguageChange } from '@/lib/analytics';

const FLAG_CLASS: Record<Locale, string> = {
  en: 'fi fi-us',
  th: 'fi fi-th',
};

const LABELS: Record<Locale, string> = {
  en: 'English',
  th: 'Thai',
};

export function LanguageSwitcher({
  currentLang,
  pathBase,
}: {
  currentLang: Locale;
  pathBase: string;
}) {
  const path = pathBase === '/' ? '' : pathBase;
  const enHref = `/en${path}`;
  const thHref = `/th${path}`;

  const alternativeLang = currentLang === 'en' ? 'th' : 'en';
  const alternativeHref = alternativeLang === 'en' ? enHref : thHref;
  const alternativeFlagClass = FLAG_CLASS[alternativeLang];
  const alternativeLabel = LABELS[alternativeLang];

  return (
    <div className="lang-switcher" role="navigation" aria-label="Language">
      <Link
        href={alternativeHref}
        scroll={false}
        className="lang-flag"
        aria-label={alternativeLabel}
        title={alternativeLabel}
        onClick={() => trackLanguageChange(alternativeLang)}
      >
        <span className={`lang-flag-icon ${alternativeFlagClass}`} aria-hidden />
      </Link>
      <style jsx>{`
        .lang-switcher {
          display: flex;
          align-items: center;
        }
        .lang-flag {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--pastel-cream);
          border: 2px solid transparent;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
        }
        .lang-flag:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }
        .lang-flag-icon {
          font-size: 1.25rem;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
