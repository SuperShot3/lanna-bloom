'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

type PartnerNavProps = {
  lang: Locale;
  current?: 'apply';
};

const localePathPrefixPattern = new RegExp(`^/(${locales.join('|')})(?=/|$)`);

/** Minimal nav for the partner application flow (self-service portal retired). */
export function PartnerNav({ lang, current }: PartnerNavProps) {
  const pathname = usePathname();
  const pathBase = pathname?.replace(localePathPrefixPattern, '') || '/partner/apply';
  const applyHref = `/${lang}/partner/apply`;

  return (
    <nav className="partner-nav">
      <div className="partner-nav-inner">
        <Link href={`/${lang}`} className="partner-nav-logo">
          <Image
            src="/favicon.svg"
            alt="Lanna Bloom logo"
            width={32}
            height={32}
            className="partner-nav-logo-img"
            priority
          />
          <div>
            <div className="partner-nav-title">Lanna Bloom</div>
            <div className="partner-nav-sub">PARTNER APPLICATION</div>
          </div>
        </Link>
        <div className="partner-nav-links">
          <div className="partner-nav-lang">
            <LanguageSwitcher currentLang={lang} pathBase={pathBase || '/partner/apply'} />
          </div>
          <Link
            href={applyHref}
            className={`partner-nav-link ${current === 'apply' ? 'active' : ''}`}
          >
            {lang === 'th' ? 'สมัคร Partner' : 'Apply'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
