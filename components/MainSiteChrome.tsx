'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import type { Locale } from '@/lib/i18n';

export function MainSiteChrome({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPartnerRoute = pathname?.includes('/partner');

  if (isPartnerRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header lang={lang} />
      <div className="main-content-wrap pt-20" style={{ viewTransitionName: 'main-content' } as React.CSSProperties}>
        <main>{children}</main>
      </div>
      <Footer lang={lang} />
    </>
  );
}
