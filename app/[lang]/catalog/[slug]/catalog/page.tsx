import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getCatalogBouquetsCatalogData,
  getCatalogProductsFiltered,
} from '@/lib/catalogReads';
import type { CatalogProduct } from '@/lib/catalog/types';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { CatalogWithFilters } from '@/components/CatalogWithFilters';
import { CatalogUnavailablePanel } from '@/components/CatalogUnavailablePanel';
import { CatalogDeliveryBar } from '@/components/CatalogDeliveryBar';
import { CATEGORY_I18N_KEYS } from '@/lib/catalogCategories';
import { parseCatalogSearchParams } from '@/lib/catalogFilterParams';
import type { Bouquet } from '@/lib/bouquets';
import {
  getMarketByPathSlug,
  isExpansionDestination,
  marketIsRouteAvailable,
} from '@/lib/delivery/markets';
import { buildMarketPageMetadata } from '@/lib/seo/marketPageMetadata';
import { getPublicProvinceByDestinationId } from '@/lib/provinces/queries';
import { canEnterCatalog, categoryAllowed } from '@/lib/provinces/shopAccess';

/** Always dynamic — reads searchParams for catalog filters. */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const market = getMarketByPathSlug(params.slug);
  if (!market || !marketIsRouteAvailable(market)) return {};
  return buildMarketPageMetadata({
    lang: params.lang as Locale,
    market,
    kind: 'catalog',
  });
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
  if (!market || !marketIsRouteAvailable(market)) notFound();

  const provinceResult = await getPublicProvinceByDestinationId(market.destinationId);
  const province = provinceResult.ok ? provinceResult.province : null;
  const marketName =
    lang === 'th' ? market.customerFacingNameTh : market.customerFacingNameEn;

  if (!canEnterCatalog(province)) {
    return (
      <div className="catalog-page">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ margin: '1.25rem auto 0', maxWidth: 1040 }}>
            <CatalogDeliveryBar lang={lang as Locale} />
          </div>
          <CatalogUnavailablePanel lang={lang as Locale} marketName={marketName} province={province} />
        </div>
      </div>
    );
  }

  const filterParams = parseCatalogSearchParams(searchParams);
  const nameSearchQueryParam = searchParams.q;
  const nameSearchQuery = Array.isArray(nameSearchQueryParam)
    ? nameSearchQueryParam[0] ?? ''
    : nameSearchQueryParam ?? '';
  const topCategory = filterParams.topCategory || 'flowers';
  const expansion = isExpansionDestination(market.destinationId);
  const categoryOk = categoryAllowed(province, topCategory, {
    isExpansionDestination: expansion,
  });

  let bouquets: Bouquet[] = [];
  let allBouquetsForFacets: Bouquet[] = [];
  let products: CatalogProduct[] = [];

  if (!categoryOk) {
    // Keep category chips; empty list triggers the existing coming-soon empty state.
    bouquets = [];
    products = [];
  } else if (topCategory === 'flowers') {
    const data = await getCatalogBouquetsCatalogData({
      ...filterParams,
      catalogDeliveryDestination: market.destinationId,
    });
    bouquets = data.bouquets;
    allBouquetsForFacets = data.allBouquets;
  } else {
    products = await getCatalogProductsFiltered({
      categoryKey: topCategory,
      sort: filterParams.sort || 'newest',
    });
  }

  const t = translations[lang as Locale].catalog;
  const occasionSlugToKey: Record<string, { title: keyof typeof t; desc: keyof typeof t }> = {
    birthday: { title: 'occasionTitleBirthday', desc: 'occasionDescBirthday' },
    anniversary: { title: 'occasionTitleAnniversary', desc: 'occasionDescAnniversary' },
    wedding: { title: 'occasionTitleWedding', desc: 'occasionDescWedding' },
    romantic: { title: 'occasionTitleRomantic', desc: 'occasionDescRomantic' },
    apology: { title: 'occasionTitleApology', desc: 'occasionDescApology' },
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

