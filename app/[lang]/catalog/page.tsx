import { notFound } from 'next/navigation';
import { getBouquetsFilteredFromSanity, type CatalogFilterParams } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { CatalogWithFilters } from '@/components/CatalogWithFilters';

// Revalidate catalog every 60 seconds so new flowers from Sanity appear without rebuild
export const revalidate = 60;

function parseSearchParams(searchParams: Record<string, string | string[] | undefined>): CatalogFilterParams {
  const category = typeof searchParams.category === 'string' ? searchParams.category : undefined;
  const colorsRaw = typeof searchParams.colors === 'string' ? searchParams.colors : undefined;
  const colors = colorsRaw ? colorsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const typesRaw = typeof searchParams.types === 'string' ? searchParams.types : undefined;
  const types = typesRaw ? typesRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
  const occasion = typeof searchParams.occasion === 'string' ? searchParams.occasion : undefined;
  const minRaw = typeof searchParams.min === 'string' ? searchParams.min : undefined;
  const min = minRaw ? parseInt(minRaw, 10) : undefined;
  const maxRaw = typeof searchParams.max === 'string' ? searchParams.max : undefined;
  const max = maxRaw ? parseInt(maxRaw, 10) : undefined;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort as CatalogFilterParams['sort'] : undefined;
  return {
    category: category || undefined,
    colors: colors?.length ? colors : undefined,
    types: types?.length ? types : undefined,
    occasion: occasion || undefined,
    min: min != null && !isNaN(min) ? min : undefined,
    max: max != null && !isNaN(max) ? max : undefined,
    sort: sort && ['newest', 'price_asc', 'price_desc'].includes(sort) ? sort : undefined,
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const filterParams = parseSearchParams(searchParams);
  const bouquets = await getBouquetsFilteredFromSanity(filterParams);
  const t = translations[lang as Locale].catalog;

  return (
    <div className="catalog-page">
      <div className="container">
        <h1 className="catalog-title">{t.title}</h1>
        <CatalogWithFilters
          lang={lang as Locale}
          bouquets={bouquets}
          filterParams={filterParams}
        />
      </div>
    </div>
  );
}
