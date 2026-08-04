import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isValidLocale, type Locale } from '@/lib/i18n';
import {
  getMarketByPathSlug,
  marketIsRouteAvailable,
} from '@/lib/delivery/markets';
import {
  getCatalogBouquetsPaginated,
  getCatalogHeroImage,
  getCatalogHeroCarouselImages,
} from '@/lib/catalogReads';
import { buildMarketPageMetadata } from '@/lib/seo/marketPageMetadata';
import { Hero } from '@/components/Hero';
import { MarketBouquetsShowcase } from '@/components/MarketBouquetsShowcase';

export const revalidate = 60;

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
  const [initialBouquets, heroImageUrl, carouselImages] = await Promise.all([
    getCatalogBouquetsPaginated(0, 12, entry.destinationId),
    getCatalogHeroImage(),
    getCatalogHeroCarouselImages(),
  ]);

  const isTh = lang === 'th';
  const marketH1 = isTh
    ? `ส่งดอกไม้ ${entry.customerFacingNameTh}`
    : `${entry.customerFacingNameEn} flower delivery`;

  return (
    <div className="market-flower-delivery-page">
      <Hero
        lang={lang}
        heroImageUrl={heroImageUrl}
        carouselImages={carouselImages}
        titleOverride={marketH1}
        browseCollectionHref="#bouquets"
        locationName={isTh ? entry.customerFacingNameTh : entry.customerFacingNameEn}
      />
      <div id="bouquets">
        <MarketBouquetsShowcase
          lang={lang}
          catalogDestination={entry.destinationId}
          initialBouquets={initialBouquets}
        />
      </div>
    </div>
  );
}
