import { notFound } from 'next/navigation';
import { ViewportSync } from '@/components/ViewportSync';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { locales, isValidLocale, type Locale } from '@/lib/i18n';
import { MainSiteChrome } from '@/components/MainSiteChrome';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/**
 * Lang layout: Header → main (page content) → Footer.
 * Partner pages hide main Header/Footer via MainSiteChrome (path-based).
 */
export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  return (
    <CookieConsentProvider>
      <CartProvider>
        <ToastProvider>
          <ViewportSync />
          <div className="lang-layout">
            <MainSiteChrome lang={lang as Locale}>{children}</MainSiteChrome>
          </div>
        </ToastProvider>
      </CartProvider>
    </CookieConsentProvider>
  );
}
