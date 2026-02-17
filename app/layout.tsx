import type { Metadata, Viewport } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { LoadingScreen } from '@/components/LoadingScreen';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Lanna Bloom | Fresh flowers delivered',
  description: 'Order beautiful bouquets via LINE, WhatsApp, or Telegram. Fresh flowers delivered with care.',
  icons: {
    icon: [
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
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
      </head>
      <body>
        <LoadingScreen />
        <GoogleAnalytics />
        <ViewTransitions>
          {children}
        </ViewTransitions>
      </body>
    </html>
  );
}
