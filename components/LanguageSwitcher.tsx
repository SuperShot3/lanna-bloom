'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';

const FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  th: '🇹🇭',
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

  return (
    <div className="lang-switcher" role="navigation" aria-label="Language">
      <Link
        href={enHref}
        scroll={false}
        className={currentLang === 'en' ? 'lang-flag active' : 'lang-flag'}
        aria-current={currentLang === 'en' ? 'true' : undefined}
        aria-label="English"
        title="English"
      >
        <span className="lang-flag-emoji" aria-hidden>{FLAGS.en}</span>
      </Link>
      <Link
        href={thHref}
        scroll={false}
        className={currentLang === 'th' ? 'lang-flag active' : 'lang-flag'}
        aria-current={currentLang === 'th' ? 'true' : undefined}
        aria-label="Thai"
        title="Thai"
      >
        <span className="lang-flag-emoji" aria-hidden>{FLAGS.th}</span>
      </Link>
      <style jsx>{`
        .lang-switcher {
          display: flex;
          align-items: center;
          gap: 8px;
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
        .lang-flag.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .lang-flag-emoji {
          font-size: 1.25rem;
          line-height: 1;
        }
        @media (max-width: 600px) {
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
