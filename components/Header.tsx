'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Locale, translations } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MessengerLinks } from './MessengerLinks';

export function Header({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/^\/(en|th)/, '') || '';
  const homeHref = `/${lang}`;
  const catalogHref = `/${lang}/catalog`;
  const t = translations[lang].nav;

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href={homeHref} className="logo" aria-label={t.home}>
          <Image
            src="/logo_full_master.png"
            alt="Lanna Bloom"
            width={160}
            height={48}
            className="logo-img"
            priority
          />
        </Link>
        <nav className="nav" aria-label="Main">
          <Link
            href={homeHref}
            className={basePath === '' ? 'nav-link active' : 'nav-link'}
          >
            {t.home}
          </Link>
          <Link
            href={catalogHref}
            className={basePath === '/catalog' ? 'nav-link active' : 'nav-link'}
          >
            {t.catalog}
          </Link>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher currentLang={lang} pathBase={basePath || '/'} />
          <MessengerLinks />
        </div>
      </div>
      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow);
        }
        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 20px;
          min-height: 60px;
        }
        .logo {
          display: flex;
          align-items: center;
        }
        .logo-img {
          height: 40px;
          width: auto;
          object-fit: contain;
        }
        @media (max-width: 600px) {
          .logo-img { height: 36px; }
        }
        .nav {
          display: flex;
          gap: 20px;
        }
        .nav-link {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-muted);
          transition: color 0.2s;
        }
        .nav-link:hover,
        .nav-link.active {
          color: var(--text);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .nav { display: none; }
          .header-inner { padding: 12px 16px; }
        }
      `}</style>
    </header>
  );
}
