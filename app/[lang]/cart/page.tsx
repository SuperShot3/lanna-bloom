import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';

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
