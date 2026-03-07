import type { Metadata, Viewport } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { InternalTrafficBootstrap } from '@/components/InternalTrafficBootstrap';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFCF8' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1715' },
  ],
};

export const metadata: Metadata = {
  title: 'Lanna Bloom | Fresh flowers delivered',
  description: 'Order beautiful bouquets via LINE, WhatsApp, or Telegram. Fresh flowers delivered with care.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Lanna Bloom | Fresh flowers delivered',
    description: 'Order beautiful bouquets via LINE, WhatsApp, or Telegram.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@flaticon/flaticon-uicons@3.3.1/css/all/all.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.2/css/flag-icons.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document !== 'undefined') {
                  document.documentElement.classList.add('loading');
                  document.addEventListener('DOMContentLoaded', function() {
                    if (document.body) {
                      document.body.classList.add('loading');
                    }
                  });
                }
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
      <body>
        <LoadingScreen />
        <InternalTrafficBootstrap />
        <GoogleAnalytics />
        <ViewTransitions>
          {children}
        </ViewTransitions>
      </body>
    </html>
  );
}
