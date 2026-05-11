'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { trackLanguageChange } from '@/lib/analytics';

const FLAG_CLASS: Record<Locale, string> = {
  en: 'fi fi-gb',
  th: 'fi fi-th',
  ru: 'fi fi-ru',
};

const LABELS: Record<Locale, string> = {
  en: 'English',
  th: 'Thai',
  ru: 'Russian',
};

const SWITCHER_QUEUE: Locale[] = ['th', 'en', 'ru'];

export function LanguageSwitcher({
  currentLang,
  pathBase,
}: {
  currentLang: Locale;
  pathBase: string;
}) {
  const path = pathBase === '/' ? '' : pathBase;
  const currentIndex = SWITCHER_QUEUE.indexOf(currentLang);
  const nextLang = SWITCHER_QUEUE[(currentIndex + 1) % SWITCHER_QUEUE.length] ?? 'th';

  return (
    <div className="lang-switcher" role="navigation" aria-label="Language">
      <Link
        href={`/${nextLang}${path}`}
        scroll={false}
        className="lang-flag"
        aria-label={LABELS[nextLang]}
        title={LABELS[nextLang]}
        onClick={() => trackLanguageChange(nextLang)}
      >
        <span className={`lang-flag-icon ${FLAG_CLASS[nextLang]}`} aria-hidden />
      </Link>
      <style jsx>{`
        .lang-switcher {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .lang-flag {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: transparent;
          border: 1px solid var(--border);
          transition: border-color 0.2s, background 0.2s, color 0.2s;
        }
        .lang-flag:hover {
          background: var(--pastel-cream);
          border-color: var(--accent-soft);
        }
        .lang-flag-icon {
          font-size: 1.22rem;
          line-height: 1;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
