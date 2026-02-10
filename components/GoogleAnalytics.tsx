'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-KBRBDXFBM1';
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-T4JGL85T';
const USE_GTM = process.env.NEXT_PUBLIC_USE_GTM === 'true';

export function GoogleAnalytics() {
  if (USE_GTM) {
    return (
      <>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <GTMPageView />
      </>
    );
  }

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="beforeInteractive"
      />
      <Script id="google-analytics" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { currency: 'THB' });
        `}
      </Script>
      <GA4PageView />
    </>
  );
}

/** Sends page_view on App Router client-side route changes (gtag mode). */
function GA4PageView() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag || !pathname) return;
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    window.gtag('event', 'page_view', { page_path: pathname, page_location: window.location.origin + pathname });
  }, [pathname]);

  return null;
}

/**
 * When using GTM: push page_view only on client-side route changes (not initial load)
 * so we don't duplicate the first page_view that GTM's GA4 Configuration tag may send.
 */
function GTMPageView() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;
    if (prevPathRef.current === pathname) return;
    const isFirst = prevPathRef.current === null;
    prevPathRef.current = pathname;
    if (isFirst) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: pathname,
      page_location: window.location.origin + pathname,
    });
  }, [pathname]);

  return null;
}
