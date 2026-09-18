import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import { buildFaqPageJsonLd } from '@/lib/seo/siteJsonLd';
import { serializeJsonLd } from '@/lib/seo/productJsonLd';
import { WeddingBouquetDesignerPageClient } from './WeddingBouquetDesignerPageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLocale(lang)) return { title: 'Lanna Bloom' };
  const t = translations[lang as Locale].weddingBouquetDesigner;
  return {
    title: `${t.metaTitle} | Lanna Bloom`,
    description: t.metaDescription,
  };
}

export default async function WeddingBouquetDesignerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLocale(lang)) notFound();
  const t = translations[lang as Locale].weddingBouquetDesigner;

  const faqJsonLd = buildFaqPageJsonLd([
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
    { q: t.faq5Q, a: t.faq5A },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <WeddingBouquetDesignerPageClient lang={lang as Locale} />
    </>
  );
}
