'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

type PartnerNavProps = {
  lang: Locale;
  current?: 'apply' | 'dashboard' | 'products' | 'login';
};

export function PartnerNav({ lang, current }: PartnerNavProps) {
  const pathname = usePathname();
  const pathBase = pathname?.replace(/^\/(en|th)/, '') || '/partner';

  const applyHref = `/${lang}/partner/apply`;
  const dashboardHref = `/${lang}/partner`;
  const productsHref = `/${lang}/partner/products/new`;
  const loginHref = `/${lang}/partner/login`;

  return (
    <nav className="partner-nav">
      <div className="partner-nav-inner">
        <Link href={`/${lang}`} className="partner-nav-logo">
          <span className="partner-nav-emoji">🌸</span>
          <div>
            <div className="partner-nav-title">Lanna Bloom</div>
            <div className="partner-nav-sub">PARTNER PORTAL</div>
          </div>
        </Link>
        <div className="partner-nav-links">
          <div className="partner-nav-lang">
            <LanguageSwitcher currentLang={lang} pathBase={pathBase || '/partner'} />
          </div>
          <Link
            href={applyHref}
            className={`partner-nav-link ${current === 'apply' ? 'active' : ''}`}
          >
            {lang === 'th' ? 'สมัคร Partner' : 'Apply'}
          </Link>
          <Link
            href={dashboardHref}
            className={`partner-nav-link ${current === 'dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href={productsHref}
            className={`partner-nav-link ${current === 'products' ? 'active' : ''}`}
          >
            {lang === 'th' ? 'เพิ่มสินค้า' : 'Add Product'}
          </Link>
          <Link
            href={loginHref}
            className={`partner-nav-link ${current === 'login' ? 'active' : ''}`}
          >
            {lang === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
