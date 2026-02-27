'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';
import { trackLanguageChange } from '@/lib/analytics';

const FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  th: '🇹🇭',
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

  return (
    <div className="lang-switcher" role="navigation" aria-label="Language">
      {/* PC: show both flags (current dimmed, alternative clickable) */}
      <span className="lang-flag lang-flag--current" aria-current="true" title={LABELS[currentLang]}>
        <span className="lang-flag-emoji" aria-hidden>{FLAGS[currentLang]}</span>
      </span>
      <Link
        href={alternativeHref}
        scroll={false}
        className="lang-flag lang-flag--switch"
        aria-label={`Switch to ${LABELS[alternativeLang]}`}
        title={LABELS[alternativeLang]}
        onClick={() => trackLanguageChange(alternativeLang)}
      >
        <span className="lang-flag-emoji" aria-hidden>{FLAGS[alternativeLang]}</span>
      </Link>
      <style jsx>{`
        .lang-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
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
        .lang-flag--current {
          cursor: default;
          opacity: 0.6;
        }
        .lang-flag--switch:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }
        .lang-flag-emoji {
          font-size: 1.25rem;
          line-height: 1;
        }
        /* Mobile: show only the switchable flag (compact) */
        @media (max-width: 600px) {
          .lang-flag--current {
            display: none;
          }
          .lang-switcher {
            gap: 0;
          }
          .lang-flag {
            width: 36px;
            height: 36px;
          }
          .lang-flag-emoji {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
}
