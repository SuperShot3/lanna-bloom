import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { isValidLocale, translations, type Locale } from '@/lib/i18n';
import {
  getMarketByPathSlug,
  marketIsRouteAvailable,
} from '@/lib/delivery/markets';
import { buildMarketCatalogHref } from '@/lib/delivery/marketRoute';
import { getCatalogHeroImage, getCatalogHeroCarouselImages } from '@/lib/catalogReads';
import { buildMarketPageMetadata } from '@/lib/seo/marketPageMetadata';
import { buildFaqPageJsonLd } from '@/lib/seo/siteJsonLd';
import { getPublicProvinceByDestinationId } from '@/lib/provinces/queries';
import { PROVINCE_SEED_ROSTER } from '@/lib/provinces/seedRoster';
import type { PublicProvince } from '@/lib/provinces/types';
import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ExperienceSection } from '@/components/ExperienceSection';
import { DeliverySection } from '@/components/home/DeliverySection';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { LocalLandingSection } from '@/components/home/LocalLandingSection';
import {
  buildMarketDeliveryCopy,
  buildMarketLocalCopy,
  fillCityPlaceholders,
  getMarketHomeFaqItems,
  timingFromProvinceStatus,
} from '@/lib/landingPages/marketHomeLanding';

export const revalidate = 60;

const HomeFaq = dynamic(
  () => import('@/components/home/HomeFaq').then((m) => m.HomeFaq),
  { ssr: true }
);

function publicProvinceFromSeed(destinationId: string): PublicProvince | null {
  const seed = PROVINCE_SEED_ROSTER.find((r) => r.destination_id === destinationId);
  if (!seed) return null;
  return {
    province_code: seed.province_code,
    province_name_en: seed.province_name_en,
    province_name_th: seed.province_name_th,
    topojson_property_value: seed.topojson_property_value,
    status: seed.status,
    catalog_enabled: seed.catalog_enabled,
    min_advance_notice_hours: null,
    same_day_cutoff_local: null,
    customer_message_en: seed.customer_message_en ?? null,
    customer_message_th: seed.customer_message_th ?? null,
    delivery_limitations_en: null,
    delivery_limitations_th: null,
    available_categories: null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string; market: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const m = getMarketByPathSlug(params.market);
  if (!m || !marketIsRouteAvailable(m)) return {};
  return buildMarketPageMetadata({
    lang: params.lang as Locale,
    market: m,
    kind: 'landing',
  });
}

export default async function MarketFlowerDeliveryPage({
  params,
}: {
  params: { lang: string; market: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  const entry = getMarketByPathSlug(params.market);
  if (!entry || !marketIsRouteAvailable(entry)) notFound();

  const lang = params.lang as Locale;
  const city =
    lang === 'th' ? entry.customerFacingNameTh : entry.customerFacingNameEn;
  const catalogHref = buildMarketCatalogHref(lang, entry.pathSlug);

  const [heroImageUrl, carouselImages, provinceResult] = await Promise.all([
    getCatalogHeroImage(),
    getCatalogHeroCarouselImages(),
    getPublicProvinceByDestinationId(entry.destinationId),
  ]);

  const province =
    (provinceResult.ok ? provinceResult.province : null) ??
    publicProvinceFromSeed(entry.destinationId);

  const faqItems = getMarketHomeFaqItems({
    lang,
    city,
    destinationId: entry.destinationId,
    province,
  });
  const faqCopy = translations[lang].homeLanding.faq;
  const jsonLd = [buildFaqPageJsonLd(faqItems)];
  const deliveryCopy = buildMarketDeliveryCopy({
    lang,
    city,
    destinationId: entry.destinationId,
    province,
  });
  const localCopy = buildMarketLocalCopy({
    lang,
    city,
    destinationId: entry.destinationId,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero
        lang={lang}
        heroImageUrl={heroImageUrl}
        carouselImages={carouselImages}
        locationName={city}
        browseCollectionHref={catalogHref}
        timing={timingFromProvinceStatus(province?.status)}
      />
      <HomeRevealInit />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection
          lang={lang}
          destinationId={entry.destinationId}
          catalogHref={catalogHref}
          province={province}
        />
      </Suspense>
      <ExperienceSection lang={lang} />
      <DeliverySection lang={lang} catalogHref={catalogHref} copy={deliveryCopy} />
      <ReviewsSection
        lang={lang}
        chiangMaiSpecific={false}
        locationName={city}
      />
      <LocalLandingSection lang={lang} catalogHref={catalogHref} copy={localCopy} />
      <HomeFaq
        lang={lang}
        faq={faqItems}
        title={fillCityPlaceholders(faqCopy.titleMarket, city)}
        subtitle={fillCityPlaceholders(faqCopy.subtitleMarket, city)}
      />
    </>
  );
}
