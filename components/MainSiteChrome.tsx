'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LineFloatingButton } from '@/components/LineFloatingButton';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
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
  const isConfirmationPending = pathname?.includes('/checkout/confirmation-pending');
  const isCartRoute = pathname?.includes('/cart');

  if (isPartnerRoute || isConfirmationPending) {
    return <>{children}</>;
  }

  return (
    <>
      <Header lang={lang} />
      <div className="main-content-wrap pt-20" style={{ viewTransitionName: 'main-content' } as React.CSSProperties}>
        <main>{children}</main>
      </div>
      <CookieConsentBanner lang={lang} />
      <Footer lang={lang} />
      {!isCartRoute && <LineFloatingButton />}
    </>
  );
}
