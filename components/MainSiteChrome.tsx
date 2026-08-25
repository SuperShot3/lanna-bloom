'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LineFloatingButton } from '@/components/LineFloatingButton';
import { MayFreeDeliveryPromoBanner } from '@/components/MayFreeDeliveryPromoBanner';
import { AdvancePeakPromoBanner } from '@/components/AdvancePeakPromoBanner';
import { PeakCelebrationNoticeBanner } from '@/components/PeakCelebrationNoticeBanner';
import type { Locale } from '@/lib/i18n';
import { DeliveryDestinationSessionSync } from '@/components/DeliveryDestinationSessionSync';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { CouponQueryCapture } from '@/components/CouponQueryCapture';

export function MainSiteChrome({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [advancePeakPromoBanner, setAdvancePeakPromoBanner] = useState(false);
  const [peakNoticeBanner, setPeakNoticeBanner] = useState(false);
  const [mayPromoBanner, setMayPromoBanner] = useState(false);
  const isPartnerRoute = pathname?.includes('/partner');
  const isConfirmationPending = pathname?.includes('/checkout/confirmation-pending');
  const isCheckoutComplete = pathname?.includes('/checkout/complete');
  const isCartRoute = pathname?.includes('/cart');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const hideTopPromoBanner = isCartRoute && isMobileViewport;
  const hasTopPromoBanner =
    !hideTopPromoBanner &&
    (advancePeakPromoBanner ||
      (!advancePeakPromoBanner && peakNoticeBanner) ||
      (!advancePeakPromoBanner && !peakNoticeBanner && mayPromoBanner));

  useEffect(() => {
    const syncViewport = () => setIsMobileViewport(window.innerWidth < 768);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  if (isPartnerRoute || isConfirmationPending || isCheckoutComplete) {
    return (
      <>
        <CouponQueryCapture lang={lang} />
        {children}
      </>
    );
  }

  return (
    <>
      <CouponQueryCapture lang={lang} />
      <DeliveryDestinationSessionSync lang={lang} />
      {!hideTopPromoBanner ? (
        <>
          <AdvancePeakPromoBanner lang={lang} onActiveChange={setAdvancePeakPromoBanner} />
          {!advancePeakPromoBanner ? (
            <PeakCelebrationNoticeBanner lang={lang} onActiveChange={setPeakNoticeBanner} />
          ) : null}
          {!advancePeakPromoBanner && !peakNoticeBanner ? (
            <MayFreeDeliveryPromoBanner lang={lang} onActiveChange={setMayPromoBanner} />
          ) : null}
        </>
      ) : null}
      <Header lang={lang} hasTopPromoBanner={hasTopPromoBanner} />
      <div
        className={`main-content-wrap ${hasTopPromoBanner ? `has-top-promo pt-[calc(3.5rem+2.25rem+env(safe-area-inset-top,0px))] md:pt-[calc(76px+2.25rem+env(safe-area-inset-top,0px))]` : 'pt-[calc(3.5rem+1px+0.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(76px+1px+0.5rem+env(safe-area-inset-top,0px))]'}`}
        style={{ viewTransitionName: 'main-content' } as React.CSSProperties}
      >
        <main>{children}</main>
      </div>
      <Footer lang={lang} />
      <LineFloatingButton lang={lang} showContactButtons={!isCartRoute} />
      <CookieConsentBanner lang={lang} />
    </>
  );
}
