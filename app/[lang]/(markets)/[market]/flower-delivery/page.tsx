import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getMarketByPathSlug } from '@/lib/delivery/markets';
import {
  getBouquetsFromSanityPaginated,
  getHeroImageFromSanity,
  getHeroCarouselImagesFromSanity,
} from '@/lib/sanity';
import { Hero } from '@/components/Hero';
import { MarketBouquetsShowcase } from '@/components/MarketBouquetsShowcase';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { lang: string; market: string };
}): Promise<Metadata> {
  const m = getMarketByPathSlug(params.market);
  if (!m) return {};
  const isTh = params.lang === 'th';
  const place = isTh ? m.customerFacingNameTh : m.customerFacingNameEn;
  const title = isTh ? `ส่งดอกไม้ ${place} | Lanna Bloom` : `Flower delivery ${place} | Lanna Bloom`;
  const description = isTh
    ? `ช่อดอกไม้สด จัดส่ง${place} เลือกช่อออนไลน์ บริการจัดส่ง`
    : `Fresh flower bouquets delivered in ${place}. Order online for local delivery.`;
  return { title, description };
}

export default async function MarketFlowerDeliveryPage({
  params,
}: {
  params: { lang: string; market: string };
}) {
  if (!isValidLocale(params.lang)) notFound();
  const entry = getMarketByPathSlug(params.market);
  if (!entry) notFound();

  const lang = params.lang as Locale;
  const [initialBouquets, heroImageUrl, carouselImages] = await Promise.all([
    getBouquetsFromSanityPaginated(0, 12, entry.destinationId),
    getHeroImageFromSanity(),
    getHeroCarouselImagesFromSanity(),
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
