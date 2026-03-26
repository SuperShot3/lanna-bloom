'use client';

import Script from 'next/script';
import { useEffect, useMemo, useState } from 'react';
import { readConsentFromDocumentCookie, type ConsentState } from '@/lib/cookieConsent';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const SHOULD_LOAD_ANALYTICS = process.env.NODE_ENV === 'production' && Boolean(GTM_ID);

type GoogleConsentUpdate = {
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
};

function toGoogleConsent(consent: { a: boolean; m: boolean }): GoogleConsentUpdate {
  const analytics = consent.a ? 'granted' : 'denied';
  const ads = consent.m ? 'granted' : 'denied';
  return {
    analytics_storage: analytics,
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  };
}

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [gtmLoaded, setGtmLoaded] = useState(false);

  const canLoadGtm = useMemo(() => {
    // Compliance-first default: do not load GTM until user grants at least analytics or marketing.
    if (!SHOULD_LOAD_ANALYTICS || !GTM_ID) return false;
    if (!consent) return false;
    return Boolean(consent.a || consent.m);
  }, [consent]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Ensure a gtag stub exists even if GTM is not loaded yet.
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag =
      (window as any).gtag ||
      function gtag() {
        (window as any).dataLayer.push(arguments);
      };

    const initial = readConsentFromDocumentCookie();
    setConsent(initial);

    const onConsent = (evt: Event) => {
      const e = evt as CustomEvent<ConsentState>;
      if (e?.detail && typeof e.detail.a === 'boolean' && typeof e.detail.m === 'boolean') {
        setConsent(e.detail);
      } else {
        setConsent(readConsentFromDocumentCookie());
      }
    };
    window.addEventListener('lb:cookie-consent', onConsent);
    return () => window.removeEventListener('lb:cookie-consent', onConsent);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Always keep Consent Mode in sync with stored preferences.
    const effective = consent ?? { a: false, m: false };
    try {
      (window as any).gtag('consent', 'update', toGoogleConsent(effective));
    } catch {
      // ignore
    }
  }, [consent?.a, consent?.m]);

  useEffect(() => {
    if (!canLoadGtm || gtmLoaded) return;
    setGtmLoaded(true);
  }, [canLoadGtm, gtmLoaded]);

  if (!SHOULD_LOAD_ANALYTICS || !GTM_ID) return null;

  return (
    <>
      {/* Consent Mode v2 defaults: denied until the user chooses. */}
      <Script id="google-consent-defaults" strategy="beforeInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
        `}
      </Script>

      {/* Load GTM only after consent choice grants at least one non-essential category. */}
      {gtmLoaded && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
          `}
        </Script>
      )}

      {/* No noscript GTM: if JS is disabled, users can't consent; safest is no tracking. */}
    </>
  );
}
