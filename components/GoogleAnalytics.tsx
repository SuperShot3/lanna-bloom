'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { touchAttributionSession } from '@/lib/analytics/captureAnalyticsContext';
import { scheduleIdle } from '@/lib/scheduleIdle';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const SHOULD_LOAD_ANALYTICS = process.env.NODE_ENV === 'production' && Boolean(GTM_ID);

let gtmInjected = false;

function injectGtm(containerId: string): void {
  if (gtmInjected || typeof document === 'undefined') return;
  if (document.getElementById('google-tag-manager')) {
    gtmInjected = true;
    return;
  }
  gtmInjected = true;

  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'google-tag-manager';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.appendChild(script);
}

/**
 * GTM + Google Consent Mode v2.
 * Notice-based cookie model: analytics/ads storage is granted by default.
 * GTM loads in production only, after idle (2.5s cap) so it does not race hydration.
 * Skips /admin so staff sessions are not sent to GA4.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    touchAttributionSession();
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    if (!SHOULD_LOAD_ANALYTICS || !GTM_ID) return;
    return scheduleIdle(() => injectGtm(GTM_ID));
  }, [pathname]);

  if (pathname?.startsWith('/admin')) return null;
  if (!SHOULD_LOAD_ANALYTICS || !GTM_ID) return null;

  return (
    <>
      <Script id="google-consent-defaults" strategy="beforeInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});
window.__lannaConsentDefaultsApplied = true;
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
  );
}
