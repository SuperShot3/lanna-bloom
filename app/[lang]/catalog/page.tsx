import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
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
import { CATEGORY_I18N_KEYS, PRODUCT_CATEGORIES } from '@/lib/catalogCategories';
import { parseCatalogSearchParams } from '@/lib/catalogFilterParams';
import { flowerTypeCatalogTitle } from '@/lib/catalog/flowerTypeTitle';
import type { Bouquet } from '@/lib/bouquets';
import { getBaseUrl } from '@/lib/orders';
import { buildAlternates } from '@/lib/seo/alternates';
import {
  openGraphLocale,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';
import {
  DELIVERY_REGION_COOKIE,
  parseDeliveryRegionCookie,
} from '@/lib/delivery/deliveryRegionCookie';
import {
  destinationDisplayName,
  isExpansionDestination,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { getPublicProvinceByDestinationId } from '@/lib/provinces/queries';
import { canEnterCatalog, categoryAllowed } from '@/lib/provinces/shopAccess';

/** Cookie-aware listing — must not cache a Phuket grid under Chiang Mai metadata. */
export const dynamic = 'force-dynamic';

const BALLOONS_SEO = {
  en: {
    title: 'Balloons Delivery in Chiang Mai | Lanna Bloom',
    description:
      'Order balloons for birthdays, surprises, flower add-ons, and gift delivery in Chiang Mai. Available with flowers, plush toys, and gifts from Lanna Bloom.',
  },
  th: {
    title: 'ส่งบอลลูนในเชียงใหม่ | Lanna Bloom',
    description:
      'สั่งบอลลูนวันเกิด เซอร์ไพรส์ หรือเสริมช่อดอกไม้ พร้อมจัดส่งของขวัญในเชียงใหม่ มีบอลลูน ตุ๊กตา และของขวัญจาก Lanna Bloom',
  },
  'zh-hk': {
    title: '清邁氣球配送 | Lanna Bloom',
    description:
      '訂購生日氣球、驚喜佈置、鮮花加購及禮品，送遞至清邁。可與鮮花、毛絨玩具及禮品一併選購。',
  },
} as const;

const CATALOG_SEO = {
  en: {
    title: 'Flower Bouquets & Gifts | Order Online | Lanna Bloom',
    description:
      'Browse bouquets, balloons, plush toys, and gifts for delivery in Chiang Mai. Order online with secure checkout from Lanna Bloom.',
  },
  th: {
    title: 'ช่อดอกไม้และของขวัญ | สั่งออนไลน์ | Lanna Bloom',
    description:
      'เลือกช่อดอกไม้ บอลลูน ตุ๊กตา และของขวัญสำหรับจัดส่งในเชียงใหม่ สั่งออนไลน์ชำระเงินปลอดภัยกับ Lanna Bloom',
  },
  'zh-hk': {
    title: '花束與禮品 | 網上訂購 | Lanna Bloom',
    description:
      '瀏覽花束、氣球、毛絨玩具及禮品，送遞至清邁。於 Lanna Bloom 網上安全結帳。',
  },
} as const;

function catalogSeoForLang(
  locale: Locale,
  seo: typeof CATALOG_SEO | typeof BALLOONS_SEO
): { title: string; description: string } {
  if (locale === 'th') return seo.th;
  if (locale === 'zh-hk') return seo['zh-hk'];
  return seo.en;
}

function catalogDestinationFromCookies(): DeliveryDestinationId {
  return (
    parseDeliveryRegionCookie(cookies().get(DELIVERY_REGION_COOKIE)?.value) ?? 'CHIANG_MAI'
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return { title: 'Lanna Bloom' };
  const locale = params.lang as Locale;
  const filterParams = parseCatalogSearchParams(searchParams);
  const canonical = `${getBaseUrl()}/${locale}/catalog`;
  const seo = catalogSeoForLang(
    locale,
    filterParams.topCategory === 'balloons' ? BALLOONS_SEO : CATALOG_SEO
  );

  return {
    title: seo.title,
    description: seo.description,
    alternates: buildAlternates({
      lang: locale,
      pathSuffix: '/catalog',
      canonical,
    }),
    openGraph: websiteOpenGraph({
      title: seo.title,
      description: seo.description,
      url: canonical,
      locale: openGraphLocale(locale),
    }),
    twitter: websiteTwitter({
      title: seo.title,
      description: seo.description,
    }),
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
  const locale = lang as Locale;
  const destinationId = catalogDestinationFromCookies();
  const expansion = isExpansionDestination(destinationId);
  const provinceResult = await getPublicProvinceByDestinationId(destinationId);
  const province = provinceResult.ok ? provinceResult.province : null;
  const marketName = destinationDisplayName(destinationId, locale);

  if (!canEnterCatalog(province)) {
    return (
      <div className="catalog-page">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ margin: '1.25rem auto 0', maxWidth: 1040 }}>
            <CatalogDeliveryBar lang={locale} />
          </div>
          <CatalogUnavailablePanel lang={locale} marketName={marketName} province={province} />
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
  const categoryOk = categoryAllowed(province, topCategory, {
    isExpansionDestination: expansion,
  });

  let bouquets: Bouquet[] = [];
  let allBouquetsForFacets: Bouquet[] = [];
  let products: CatalogProduct[] = [];

  if (!categoryOk) {
    bouquets = [];
    products = [];
  } else if (topCategory === 'flowers') {
    const data = await getCatalogBouquetsCatalogData({
      ...filterParams,
      catalogDeliveryDestination: destinationId,
    });
    bouquets = data.bouquets;
    allBouquetsForFacets = data.allBouquets;
  } else if (PRODUCT_CATEGORIES.includes(topCategory as (typeof PRODUCT_CATEGORIES)[number])) {
    products = await getCatalogProductsFiltered({
      categoryKey: topCategory,
      sort: filterParams.sort || 'newest',
      catalogDeliveryDestination: destinationId,
    });
  }

  const t = translations[locale].catalog;

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
  const singleFlowerType =
    !occasionKeys &&
    topCategory === 'flowers' &&
    filterParams.types?.length === 1
      ? filterParams.types[0]
      : null;
  const title = occasionKeys
    ? (t[occasionKeys.title] as string)
    : singleFlowerType
      ? flowerTypeCatalogTitle(singleFlowerType, locale)
      : topCategory !== 'flowers' && CATEGORY_I18N_KEYS[topCategory as keyof typeof CATEGORY_I18N_KEYS]
        ? (t[CATEGORY_I18N_KEYS[topCategory as keyof typeof CATEGORY_I18N_KEYS] as keyof typeof t] as string)
        : t.title;
  const description = occasionKeys ? (t[occasionKeys.desc] as string) : undefined;

  return (
    <div className="catalog-page">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CatalogWithFilters
          lang={locale}
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
