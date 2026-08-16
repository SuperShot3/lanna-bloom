import type { Metadata, Viewport } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import { DocumentLangSync } from '@/components/DocumentLangSync';
import { AhrefsAnalytics } from '@/components/AhrefsAnalytics';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { InternalTrafficBootstrap } from '@/components/InternalTrafficBootstrap';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { mulish } from '@/lib/fonts';
import { getBaseUrl } from '@/lib/orders';
import {
  BRAND_APPLE_TOUCH,
  BRAND_FAVICON_16,
  BRAND_FAVICON_32,
  BRAND_FAVICON_ICO,
  BRAND_WEB_MANIFEST,
} from '@/lib/brandLogo';
import { websiteOpenGraph, websiteTwitter } from '@/lib/seo/shareMetadata';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const SITE_TITLE = 'Lanna Bloom | Flower & gift delivery Chiang Mai';
const SITE_DESCRIPTION =
  'Premium flower and gift delivery in Chiang Mai, Thailand. Order online with secure checkout — same-day delivery when available. Bouquet delivery in selected Thailand destinations.';
const SITE_OG_DESCRIPTION =
  'Premium flower and gift delivery in Chiang Mai, Thailand. Order online with secure checkout — same-day delivery when available.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FDFCF8',
};

const siteOrigin = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: BRAND_FAVICON_ICO, sizes: 'any' },
      { url: BRAND_FAVICON_32, sizes: '32x32', type: 'image/png' },
      { url: BRAND_FAVICON_16, sizes: '16x16', type: 'image/png' },
    ],
    apple: BRAND_APPLE_TOUCH,
  },
  manifest: BRAND_WEB_MANIFEST,
  openGraph: websiteOpenGraph({
    title: SITE_TITLE,
    description: SITE_OG_DESCRIPTION,
    url: siteOrigin,
  }),
  twitter: websiteTwitter({
    title: SITE_TITLE,
    description: SITE_OG_DESCRIPTION,
  }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Non-blocking: language switcher flags; media swap after load so it does not block LCP */}
        <link
          id="flag-icons-css"
          rel="stylesheet"
          href="/vendor/flag-icons/css/flag-icons.min.css"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.getElementById('flag-icons-css');if(!l)return;var a=function(){l.media='all'};l.addEventListener('load',a);if(l.sheet)a();})();`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href="/vendor/flag-icons/css/flag-icons.min.css" />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document === 'undefined') return;
                document.documentElement.classList.add('light');
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var p = new URLSearchParams(window.location.search);
  if (p.get('internal_user') === 'true') {
    var domainPart = (window.location.hostname && window.location.hostname.indexOf('lannabloom.shop') !== -1) ? ' Domain=.lannabloom.shop;' : '';
    document.cookie = 'is_internal_staff=true; Max-Age=31536000; Path=/;' + domainPart + ' SameSite=Lax; Secure';
    console.log('Internal Cookie Set Successfully');
    p.delete('internal_user');
    var q = p.toString();
    var u = q ? window.location.pathname + '?' + q : window.location.pathname;
    window.history.replaceState({}, '', u);
  }
  var m = document.cookie.match(/\\bis_internal_staff=([^;]*)/);
  if (m && m[1] === 'true') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ traffic_type: 'internal' });
  }
})();
            `,
          }}
        />
      </head>
      <body className={`${mulish.variable} ${mulish.className}`}>
        <ThemeProvider>
          <CookieConsentProvider>
            <DocumentLangSync />
            <InternalTrafficBootstrap />
            <GoogleAnalytics />
            <WebVitalsReporter />
            <SpeedInsights />
            <AhrefsAnalytics />
            <ViewTransitions>
              {children}
            </ViewTransitions>
          </CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
