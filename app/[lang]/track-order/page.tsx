import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { OrderLookupSection } from '@/components/OrderLookupSection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const t = translations[lang as Locale].nav;
  return { title: `${t.trackOrder} | Lanna Bloom` };
}

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  return (
    <main className="track-order-page">
      <div className="container">
        <OrderLookupSection lang={lang as Locale} />
      </div>
    </main>
  );
}
