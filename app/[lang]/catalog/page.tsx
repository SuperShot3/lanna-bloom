import { notFound } from 'next/navigation';
import { getBouquetsFilteredFromSanity, getProductsFilteredFromSanity, type CatalogFilterParams } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { CatalogWithFilters } from '@/components/CatalogWithFilters';
import { CATEGORY_I18N_KEYS, PRODUCT_CATEGORIES } from '@/lib/catalogCategories';

// Revalidate catalog every 60 seconds so new flowers from Sanity appear without rebuild
export const revalidate = 60;

function parseSearchParams(searchParams: Record<string, string | string[] | undefined>): CatalogFilterParams {
  const topCategoryRaw = typeof searchParams.topCategory === 'string' ? searchParams.topCategory : undefined;
  const topCategory =
    topCategoryRaw === 'flowers' || (topCategoryRaw && PRODUCT_CATEGORIES.includes(topCategoryRaw as (typeof PRODUCT_CATEGORIES)[number]))
      ? topCategoryRaw
      : undefined;
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
    topCategory: topCategory || undefined,
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
  const topCategory = filterParams.topCategory || 'flowers';

  let bouquets: Awaited<ReturnType<typeof getBouquetsFilteredFromSanity>> = [];
  let products: Awaited<ReturnType<typeof getProductsFilteredFromSanity>> = [];

  if (topCategory === 'flowers') {
    bouquets = await getBouquetsFilteredFromSanity(filterParams);
  } else if (PRODUCT_CATEGORIES.includes(topCategory as (typeof PRODUCT_CATEGORIES)[number])) {
    products = await getProductsFilteredFromSanity({
      categoryKey: topCategory,
      sort: filterParams.sort || 'newest',
    });
  }

  const t = translations[lang as Locale].catalog;

  const occasionSlugToKey: Record<string, { title: keyof typeof t; desc: keyof typeof t }> = {
    birthday: { title: 'occasionTitleBirthday', desc: 'occasionDescBirthday' },
    anniversary: { title: 'occasionTitleAnniversary', desc: 'occasionDescAnniversary' },
    romantic: { title: 'occasionTitleRomantic', desc: 'occasionDescRomantic' },
    sympathy: { title: 'occasionTitleSympathy', desc: 'occasionDescSympathy' },
    congrats: { title: 'occasionTitleCongrats', desc: 'occasionDescCongrats' },
    get_well: { title: 'occasionTitleGetWell', desc: 'occasionDescGetWell' },
  };

  const occasionKeys = filterParams.occasion ? occasionSlugToKey[filterParams.occasion] : null;
  const title = occasionKeys
    ? (t[occasionKeys.title] as string)
    : topCategory !== 'flowers' && CATEGORY_I18N_KEYS[topCategory as keyof typeof CATEGORY_I18N_KEYS]
      ? (t[CATEGORY_I18N_KEYS[topCategory as keyof typeof CATEGORY_I18N_KEYS] as keyof typeof t] as string)
      : t.title;
  const description = occasionKeys ? (t[occasionKeys.desc] as string) : undefined;

  return (
    <div className="catalog-page">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CatalogWithFilters
          lang={lang as Locale}
          bouquets={bouquets.length > 0 ? bouquets : undefined}
          products={products.length > 0 ? products : undefined}
          filterParams={filterParams}
          title={title}
          description={description}
        />
      </div>
    </div>
  );
}
