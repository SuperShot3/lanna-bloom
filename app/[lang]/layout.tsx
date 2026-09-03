import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ViewportSync } from '@/components/ViewportSync';
import { CartProvider } from '@/contexts/CartContext';
import { CheckoutStickyHeaderProvider } from '@/contexts/CheckoutStickyHeaderContext';
import { FlowerFilterSheetOpenProvider } from '@/contexts/FlowerFilterSheetOpenContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { CurrencyDisplayProvider } from '@/contexts/CurrencyDisplayContext';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { notoSansCyrillic, notoSansTc } from '@/lib/fonts';
import { nonSeoLocaleRobots } from '@/lib/seo/alternates';
import { MainSiteChrome } from '@/components/MainSiteChrome';

/** Thin locales (ru / zh-sg): noindex, follow. SEO locales omit robots here. */
export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const robots = nonSeoLocaleRobots(params.lang);
  return robots ? { robots } : {};
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
  const langShellClass =
    lang === 'ru'
      ? `lang-layout ${notoSansCyrillic.variable}`
      : lang === 'zh-hk'
        ? `lang-layout ${notoSansTc.variable}`
        : 'lang-layout';
  return (
    <CurrencyDisplayProvider>
      <CartProvider>
        <CheckoutStickyHeaderProvider>
          <ToastProvider>
            <FlowerFilterSheetOpenProvider>
              <ViewportSync />
              <div className={langShellClass}>
                <MainSiteChrome lang={lang as Locale}>{children}</MainSiteChrome>
              </div>
            </FlowerFilterSheetOpenProvider>
          </ToastProvider>
        </CheckoutStickyHeaderProvider>
      </CartProvider>
    </CurrencyDisplayProvider>
  );
}
