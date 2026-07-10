import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const locale = params.lang as Locale;
  const title = `${translations[locale].cart.yourCart} | Lanna Bloom`;
  return {
    title,
    robots: { index: false, follow: false },
  };
}

const CartPageClient = dynamic(
  () => import('./CartPageClient').then((m) => m.CartPageClient),
  { ssr: false, loading: () => <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading cart...</div> }
);

export default function CartPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  return <CartPageClient lang={lang as Locale} />;
}
