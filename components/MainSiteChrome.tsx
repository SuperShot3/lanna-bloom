'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LineFloatingButton } from '@/components/LineFloatingButton';
import { PrimeHourPromoBanner } from '@/components/PrimeHourPromoBanner';
import type { Locale } from '@/lib/i18n';

export function MainSiteChrome({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [primeHourBanner, setPrimeHourBanner] = useState(false);
  const isPartnerRoute = pathname?.includes('/partner');
  const isConfirmationPending = pathname?.includes('/checkout/confirmation-pending');
  const isCartRoute = pathname?.includes('/cart');

  if (isPartnerRoute || isConfirmationPending) {
    return <>{children}</>;
  }

  return (
    <>
      <PrimeHourPromoBanner lang={lang} onActiveChange={setPrimeHourBanner} />
      <Header lang={lang} hasPrimeHourBanner={primeHourBanner} />
      <div
        className={`main-content-wrap ${primeHourBanner ? 'pt-[calc(5rem+2.25rem+env(safe-area-inset-top,0px))]' : 'pt-[calc(5rem+1px+0.5rem)]'}`}
        style={{ viewTransitionName: 'main-content' } as React.CSSProperties}
      >
        <main>{children}</main>
      </div>
      <Footer lang={lang} />
      {!isCartRoute && <LineFloatingButton />}
    </>
  );
}
