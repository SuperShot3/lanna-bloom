import type { Metadata, Viewport } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { MicrosoftClarity } from '@/components/MicrosoftClarity';
import { InternalTrafficBootstrap } from '@/components/InternalTrafficBootstrap';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FDFCF8',
};

export const metadata: Metadata = {
  title: 'Lanna Bloom | Fresh flowers delivered',
  description: 'Order beautiful bouquets via LINE or WhatsApp. Fresh flowers delivered with care.',
  icons: {
    icon: [
      { url: '/favicon_io/favicon.ico', sizes: 'any' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/favicon_io/apple-touch-icon.png',
  },
  manifest: '/favicon_io/site.webmanifest',
  openGraph: {
    title: 'Lanna Bloom | Fresh flowers delivered',
    description: 'Order beautiful bouquets via LINE or WhatsApp.',
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
          href="https://fonts.googleapis.com/css2?family=Arima+Madurai:wght@300;400;500;700;800;900&family=Mulish:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
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
                if (typeof document === 'undefined') return;
                document.documentElement.classList.add('light');
                document.documentElement.classList.add('loading');
                document.addEventListener('DOMContentLoaded', function() {
                  if (document.body) document.body.classList.add('loading');
                });
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
        <ThemeProvider>
          <LoadingScreen />
          <InternalTrafficBootstrap />
          <GoogleAnalytics />
          <MicrosoftClarity />
          <ViewTransitions>
            {children}
          </ViewTransitions>
        </ThemeProvider>
      </body>
    </html>
  );
}
