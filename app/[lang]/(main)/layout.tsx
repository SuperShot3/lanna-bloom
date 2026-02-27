import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { notFound } from 'next/navigation';

/**
 * Main site layout: Header → main content → Footer.
 * Used for all non-partner pages (home, catalog, cart, etc.).
 */
export default function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();

  return (
    <>
      <Header lang={lang as Locale} />
      <div className="main-content-wrap" style={{ viewTransitionName: 'main-content' } as React.CSSProperties}>
        <main>{children}</main>
      </div>
      <Footer lang={lang as Locale} />
    </>
  );
}
