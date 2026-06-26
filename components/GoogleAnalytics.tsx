'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const SHOULD_LOAD_ANALYTICS = process.env.NODE_ENV === 'production' && Boolean(GTM_ID);

/**
 * GTM + Google Consent Mode v2.
 * Consent defaults are denied until the visitor accepts via CookieConsentBanner.
 * GTM loads only after accept. Skips /admin so staff sessions are not sent to GA4.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const { status, hydrated } = useCookieConsent();

  if (pathname?.startsWith('/admin')) return null;
  if (!SHOULD_LOAD_ANALYTICS || !GTM_ID) return null;

  const consentAccepted = hydrated && status === 'accepted';

  return (
    <>
      <Script id="google-consent-defaults" strategy="beforeInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
window.__lannaConsentDefaultsApplied = true;
        `}
      </Script>
      {consentAccepted ? (
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
        </>
      ) : null}
    </>
  );
}
