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
const NEXT_LANG: Record<Locale, Locale> = {
  en: 'th',
  th: 'ru',
  ru: 'en',
};

export function LanguageSwitcher({
  currentLang,
  pathBase,
  variant = 'cycle',
  onNavigate,
}: {
  currentLang: Locale;
  pathBase: string;
  variant?: 'cycle' | 'flags';
  onNavigate?: () => void;
}) {
  const path = pathBase === '/' ? '' : pathBase;
  const nextLang = NEXT_LANG[currentLang];

  if (variant === 'flags') {
    return (
      <div className="lang-switcher lang-switcher--flags" role="navigation" aria-label="Language">
        {SWITCHER_QUEUE.map((locale) => {
          const isActive = locale === currentLang;
          return (
            <Link
              key={locale}
              href={`/${locale}${path}`}
              scroll={false}
              className={`lang-flag lang-flag--row ${isActive ? 'lang-flag--active' : ''}`}
              aria-label={LABELS[locale]}
              aria-current={isActive ? 'page' : undefined}
              title={LABELS[locale]}
              onClick={() => {
                if (!isActive) trackLanguageChange(locale);
                onNavigate?.();
              }}
            >
              <span className={`lang-flag-icon ${FLAG_CLASS[locale]}`} aria-hidden />
            </Link>
          );
        })}
        <style jsx>{`
          .lang-switcher {
            display: flex;
            align-items: center;
            flex-shrink: 0;
          }
          .lang-switcher--flags {
            gap: 10px;
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
          .lang-flag:hover,
          .lang-flag--active {
            background: var(--pastel-cream);
            border-color: var(--accent-soft);
          }
          .lang-flag--row {
            background: #fff;
            box-shadow: 0 1px 4px rgba(26, 60, 52, 0.08);
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

  return (
    <div className="lang-switcher" role="navigation" aria-label="Language">
      <Link
        href={`/${nextLang}${path}`}
        scroll={false}
        className="lang-flag"
        aria-label={LABELS[nextLang]}
        title={LABELS[nextLang]}
        onClick={() => {
          trackLanguageChange(nextLang);
          onNavigate?.();
        }}
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
