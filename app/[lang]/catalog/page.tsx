import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getBalloonsFilteredFromSanity,
  getBouquetsCatalogData,
  getPlushyToysFilteredFromSanity,
  getProductsFilteredFromSanity,
  type CatalogProduct,
} from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { CatalogWithFilters } from '@/components/CatalogWithFilters';
import { CATEGORY_I18N_KEYS, PRODUCT_CATEGORIES } from '@/lib/catalogCategories';
import { parseCatalogSearchParams } from '@/lib/catalogFilterParams';
import type { Bouquet } from '@/lib/bouquets';
import { getBaseUrl } from '@/lib/orders';

// Revalidate catalog every 60 seconds so new flowers from Sanity appear without rebuild
export const revalidate = 60;

const BALLOONS_SEO_TITLE = 'Balloons Delivery in Chiang Mai';
const BALLOONS_SEO_DESCRIPTION =
  'Order balloons for birthdays, surprises, flower add-ons, and gift delivery in Chiang Mai. Available with flowers, plush toys, and gifts from Lanna Bloom.';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const filterParams = parseCatalogSearchParams(searchParams);
  if (filterParams.topCategory !== 'balloons') return {};

  const locale = params.lang as Locale;
  const canonical = `${getBaseUrl()}/${locale}/catalog?topCategory=balloons`;
  return {
    title: BALLOONS_SEO_TITLE,
    description: BALLOONS_SEO_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: BALLOONS_SEO_TITLE,
      description: BALLOONS_SEO_DESCRIPTION,
      url: canonical,
      siteName: 'Lanna Bloom',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      type: 'website',
    },
  };
}

function flowerTypeCountsFromBouquets(bouquets: Bouquet[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of bouquets) {
    for (const ft of b.flowerTypes ?? []) {
      counts[ft] = (counts[ft] ?? 0) + 1;
    }
  }
  return counts;
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
  const filterParams = parseCatalogSearchParams(searchParams);
  const nameSearchQueryParam = searchParams.q;
  const nameSearchQuery = Array.isArray(nameSearchQueryParam)
    ? nameSearchQueryParam[0] ?? ''
    : nameSearchQueryParam ?? '';
  const topCategory = filterParams.topCategory || 'flowers';

  let bouquets: Bouquet[] = [];
  let allBouquetsForFacets: Bouquet[] = [];
  let products: CatalogProduct[] = [];

  if (topCategory === 'flowers') {
    const data = await getBouquetsCatalogData(filterParams);
    bouquets = data.bouquets;
    allBouquetsForFacets = data.allBouquets;
  } else if (topCategory === 'plushy_toys') {
    products = await getPlushyToysFilteredFromSanity({
      sort: filterParams.sort || 'newest',
    });
  } else if (topCategory === 'balloons') {
    products = await getBalloonsFilteredFromSanity({
      sort: filterParams.sort || 'newest',
    });
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
          flowerTypeCounts={
            topCategory === 'flowers' && allBouquetsForFacets.length > 0
              ? flowerTypeCountsFromBouquets(allBouquetsForFacets)
              : undefined
          }
          title={title}
          description={description}
          nameSearchQuery={nameSearchQuery}
        />
      </div>
    </div>
  );
}
