'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { IdleImport } from '@/components/IdleImport';
import type { Locale } from '@/lib/i18n';
import { DeliveryDestinationSessionSync } from '@/components/DeliveryDestinationSessionSync';
import { CouponQueryCapture } from '@/components/CouponQueryCapture';
import { getActiveTopPromoBannerKind } from '@/lib/promo/topPromoBanner';

const loadAdvancePeakPromoBanner = () =>
  import('@/components/AdvancePeakPromoBanner').then((m) => m.AdvancePeakPromoBanner);
const loadPeakCelebrationNoticeBanner = () =>
  import('@/components/PeakCelebrationNoticeBanner').then((m) => m.PeakCelebrationNoticeBanner);
const loadMayFreeDeliveryPromoBanner = () =>
  import('@/components/MayFreeDeliveryPromoBanner').then((m) => m.MayFreeDeliveryPromoBanner);
const loadLineFloatingButton = () =>
  import('@/components/LineFloatingButton').then((m) => m.LineFloatingButton);
const loadConversionDiscountRoot = () =>
  import('@/components/conversionDiscount/ConversionDiscountRoot').then(
    (m) => m.ConversionDiscountRoot
  );
const loadCookieConsentBanner = () =>
  import('@/components/legal/CookieConsentBanner').then((m) => m.CookieConsentBanner);
const loadDeliveryDestinationPrompt = () =>
  import('@/components/DeliveryDestinationPrompt').then((m) => m.DeliveryDestinationPrompt);
const loadFloatingFavoritesBadge = () =>
  import('@/components/FloatingFavoritesBadge').then((m) => m.FloatingFavoritesBadge);

export function MainSiteChrome({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [advancePeakPromoBanner, setAdvancePeakPromoBanner] = useState(
    () => getActiveTopPromoBannerKind() === 'advance'
  );
  const [peakNoticeBanner, setPeakNoticeBanner] = useState(
    () => getActiveTopPromoBannerKind() === 'peak'
  );
  const [mayPromoBanner, setMayPromoBanner] = useState(
    () => getActiveTopPromoBannerKind() === 'may'
  );
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
          <IdleImport
            load={loadAdvancePeakPromoBanner}
            componentProps={{ lang, onActiveChange: setAdvancePeakPromoBanner }}
          />
          {!advancePeakPromoBanner ? (
            <IdleImport
              load={loadPeakCelebrationNoticeBanner}
              componentProps={{ lang, onActiveChange: setPeakNoticeBanner }}
            />
          ) : null}
          {!advancePeakPromoBanner && !peakNoticeBanner ? (
            <IdleImport
              load={loadMayFreeDeliveryPromoBanner}
              componentProps={{ lang, onActiveChange: setMayPromoBanner }}
            />
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
      <IdleImport
        load={loadLineFloatingButton}
        componentProps={{ lang, showContactButtons: !isCartRoute }}
      />
      <IdleImport load={loadConversionDiscountRoot} componentProps={{ lang }} />
      <IdleImport load={loadCookieConsentBanner} componentProps={{ lang }} />
      <IdleImport
        load={loadDeliveryDestinationPrompt}
        componentProps={{ lang, hasTopPromoBanner }}
      />
      <IdleImport load={loadFloatingFavoritesBadge} componentProps={{ lang }} />
    </>
  );
}
