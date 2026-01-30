'use client';

import Link from 'next/link';
import { Locale } from '@/lib/i18n';

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
        className={currentLang === 'en' ? 'lang-link active' : 'lang-link'}
        aria-current={currentLang === 'en' ? 'true' : undefined}
      >
        EN
      </Link>
      <span className="lang-sep" aria-hidden>|</span>
      <Link
        href={thHref}
        className={currentLang === 'th' ? 'lang-link active' : 'lang-link'}
        aria-current={currentLang === 'th' ? 'true' : undefined}
      >
        TH
      </Link>
      <style jsx>{`
        .lang-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .lang-link {
          color: var(--text-muted);
          padding: 4px 6px;
          border-radius: 6px;
          transition: color 0.2s, background 0.2s;
        }
        .lang-link:hover {
          color: var(--text);
        }
        .lang-link.active {
          color: var(--accent);
          background: var(--accent-soft);
        }
        .lang-sep {
          color: var(--border);
          user-select: none;
        }
      `}</style>
    </div>
  );
}
