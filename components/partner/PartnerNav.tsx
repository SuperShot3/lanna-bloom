'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PartnerLogoutButton } from '@/components/partner/PartnerLogoutButton';

type PartnerNavProps = {
  lang: Locale;
  current?: 'apply' | 'dashboard' | 'products' | 'productsAdd' | 'login' | 'howItWorks';
  pendingCount?: number;
  /** When true, show Dashboard/My products/Add Product/Log out. When false, show Apply/Login only. */
  isLoggedIn?: boolean;
};

export function PartnerNav({ lang, current, pendingCount = 0, isLoggedIn = false }: PartnerNavProps) {
  const pathname = usePathname();
  const pathBase = pathname?.replace(/^\/(en|th)/, '') || '/partner';

  const applyHref = `/${lang}/partner/apply`;
  const howItWorksHref = `/${lang}/partner/how-it-works`;
  const howLabel = translations[lang].partnerPortal.howItWorks.navLabel;
  const dashboardHref = `/${lang}/partner`;
  const productsHref = `/${lang}/partner/products`;
  const productsAddHref = `/${lang}/partner/products/new`;
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
          {isLoggedIn ? (
            <>
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
                {lang === 'th' ? 'สินค้าของฉัน' : 'My products'}
                {pendingCount > 0 && (
                  <span className="partner-nav-pending-badge" title={lang === 'th' ? `${pendingCount} รอตรวจสอบ` : `${pendingCount} pending`}>
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link
                href={productsAddHref}
                className={`partner-nav-link ${current === 'productsAdd' ? 'active' : ''}`}
              >
                {lang === 'th' ? 'เพิ่มสินค้า' : 'Add Product'}
              </Link>
              <PartnerLogoutButton lang={lang} />
            </>
          ) : (
            <>
              <Link
                href={howItWorksHref}
                className={`partner-nav-link ${current === 'howItWorks' ? 'active' : ''}`}
              >
                {howLabel}
              </Link>
              <Link
                href={applyHref}
                className={`partner-nav-link ${current === 'apply' ? 'active' : ''}`}
              >
                {lang === 'th' ? 'สมัคร Partner' : 'Apply'}
              </Link>
              <Link
                href={loginHref}
                className={`partner-nav-link ${current === 'login' ? 'active' : ''}`}
              >
                {lang === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
