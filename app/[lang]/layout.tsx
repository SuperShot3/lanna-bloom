import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ViewportSync } from '@/components/ViewportSync';
import { CartProvider } from '@/contexts/CartContext';
import { locales, isValidLocale, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

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
      <ViewportSync />
      <Header lang={lang as Locale} />
      <div className="main-content-wrap" style={{ viewTransitionName: 'main-content' } as React.CSSProperties}>
        <main>{children}</main>
      </div>
      <Footer lang={lang as Locale} />
    </CartProvider>
  );
}
