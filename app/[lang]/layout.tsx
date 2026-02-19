import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ViewportSync } from '@/components/ViewportSync';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { locales, isValidLocale, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/**
 * Layout order: Header → main (page content) → Footer.
 * Uses flex column so main grows and footer stays at bottom.
 * Root cause of "footer before catalog" was lack of explicit flex structure;
 * main-content-wrap + main + footer now in a single column wrapper.
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
      <ToastProvider>
      <ViewportSync />
      <div className="lang-layout">
        <Header lang={lang as Locale} />
        <div className="main-content-wrap" style={{ viewTransitionName: 'main-content' } as React.CSSProperties}>
          <main>{children}</main>
        </div>
        <Footer lang={lang as Locale} />
      </div>
      </ToastProvider>
    </CartProvider>
  );
}
