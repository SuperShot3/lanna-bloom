import { notFound } from 'next/navigation';
import {
  getBouquetsCatalogData,
  getProductsFilteredFromSanity,
  type CatalogProduct,
} from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { CatalogWithFilters } from '@/components/CatalogWithFilters';
import { CATEGORY_I18N_KEYS, PRODUCT_CATEGORIES } from '@/lib/catalogCategories';
import { parseCatalogSearchParams } from '@/lib/catalogFilterParams';
import type { Bouquet } from '@/lib/bouquets';
import { getMarketByPathSlug } from '@/lib/delivery/markets';

/** Always dynamic — reads searchParams for catalog filters. */
export const dynamic = 'force-dynamic';

function flowerTypeCountsFromBouquets(bouquets: Bouquet[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of bouquets) {
    for (const ft of b.flowerTypes ?? []) {
      counts[ft] = (counts[ft] ?? 0) + 1;
    }
  }
  return counts;
}

export default async function MarketCatalogPageViaSlug({
  params,
  searchParams,
}: {
  params: { lang: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const lang = params.lang;
  if (!isValidLocale(lang)) notFound();
  const market = getMarketByPathSlug(params.slug);
  if (!market) notFound();

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
    const data = await getBouquetsCatalogData({
      ...filterParams,
      catalogDeliveryDestination: market.destinationId,
    });
    bouquets = data.bouquets;
    allBouquetsForFacets = data.allBouquets;
  } else if (PRODUCT_CATEGORIES.includes(topCategory as (typeof PRODUCT_CATEGORIES)[number])) {
    // Expansion market restriction: keep chips visible, show coming soon (empty list).
    products = [];
  } else {
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
  const baseTitle = occasionKeys
    ? (t[occasionKeys.title] as string)
    : topCategory !== 'flowers' && CATEGORY_I18N_KEYS[topCategory as keyof typeof CATEGORY_I18N_KEYS]
      ? (t[CATEGORY_I18N_KEYS[topCategory as keyof typeof CATEGORY_I18N_KEYS] as keyof typeof t] as string)
      : t.title;
  const title = `${baseTitle} — ${market.customerFacingNameEn}`;
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

