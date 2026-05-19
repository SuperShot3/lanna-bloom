'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LineFloatingButton } from '@/components/LineFloatingButton';
import { MayFreeDeliveryPromoBanner } from '@/components/MayFreeDeliveryPromoBanner';
import type { Locale } from '@/lib/i18n';
import { DeliveryDestinationSessionSync } from '@/components/DeliveryDestinationSessionSync';

export function MainSiteChrome({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mayPromoBanner, setMayPromoBanner] = useState(false);
  const isPartnerRoute = pathname?.includes('/partner');
  const isConfirmationPending = pathname?.includes('/checkout/confirmation-pending');
  const isCheckoutComplete = pathname?.includes('/checkout/complete');
  const isCartRoute = pathname?.includes('/cart');

  if (isPartnerRoute || isConfirmationPending || isCheckoutComplete) {
    return <>{children}</>;
  }

  return (
    <>
      <DeliveryDestinationSessionSync lang={lang} />
      <MayFreeDeliveryPromoBanner lang={lang} onActiveChange={setMayPromoBanner} />
      <Header lang={lang} hasMayPromoBanner={mayPromoBanner} />
      <div
        className={`main-content-wrap ${mayPromoBanner ? `pt-[calc(5rem+2.25rem+env(safe-area-inset-top,0px))]` : 'pt-[calc(5rem+1px+0.5rem)]'}`}
        style={{ viewTransitionName: 'main-content' } as React.CSSProperties}
      >
        <main>{children}</main>
      </div>
      <Footer lang={lang} />
      {!isCartRoute && <LineFloatingButton />}
    </>
  );
}
