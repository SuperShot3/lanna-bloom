import { notFound } from 'next/navigation';
import { ViewportSync } from '@/components/ViewportSync';
import { CartProvider } from '@/contexts/CartContext';
import { CheckoutStickyHeaderProvider } from '@/contexts/CheckoutStickyHeaderContext';
import { FlowerFilterSheetOpenProvider } from '@/contexts/FlowerFilterSheetOpenContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { locales, isValidLocale, type Locale } from '@/lib/i18n';
import { MainSiteChrome } from '@/components/MainSiteChrome';
import { FloatingFavoritesBadge } from '@/components/FloatingFavoritesBadge';

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
    <CartProvider>
      <CheckoutStickyHeaderProvider>
        <ToastProvider>
          <FlowerFilterSheetOpenProvider>
            <ViewportSync />
            <div className="lang-layout">
              <FloatingFavoritesBadge lang={lang as Locale} />
              <MainSiteChrome lang={lang as Locale}>{children}</MainSiteChrome>
            </div>
          </FlowerFilterSheetOpenProvider>
        </ToastProvider>
      </CheckoutStickyHeaderProvider>
    </CartProvider>
  );
}
