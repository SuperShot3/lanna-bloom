import { notFound } from 'next/navigation';
import { BouquetCard } from '@/components/BouquetCard';
import { getBouquetsByCategoryFromSanity } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

// Revalidate catalog every 60 seconds so new flowers from Sanity appear without rebuild
export const revalidate = 60;

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { category?: string };
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const category = searchParams.category || 'all';
  const bouquets = await getBouquetsByCategoryFromSanity(category);
  const t = translations[lang as Locale].catalog;

  return (
    <div className="catalog-page">
      <div className="container">
        <h1 className="catalog-title">{t.title}</h1>
        <div className="catalog-grid">
          {bouquets.map((bouquet) => (
            <BouquetCard key={bouquet.id} bouquet={bouquet} lang={lang as Locale} />
          ))}
        </div>
      </div>
    </div>
  );
}
