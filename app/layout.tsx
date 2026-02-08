import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Lanna Bloom | Fresh flowers delivered',
  description: 'Order beautiful bouquets via LINE, WhatsApp, or Telegram. Fresh flowers delivered with care.',
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
        <link rel="icon" href="/logo_icon_64.png" sizes="64x64" type="image/png" />
        <link rel="icon" href="/logo_icon_128.png" sizes="128x128" type="image/png" />
        <link rel="apple-touch-icon" href="/logo_icon_256.png" sizes="256x256" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
