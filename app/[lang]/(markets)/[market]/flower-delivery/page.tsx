import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
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
  const marketName = isTh ? entry.customerFacingNameTh : entry.customerFacingNameEn;
  const abroadHref = `/${lang}/info/buy-flowers-online-chiang-mai-thailand`;
  const abroadNote = isTh
    ? `สั่งจากต่างประเทศไปยัง ${marketName}? จ่ายบัตรต่างประเทศได้ — อ่าน `
    : `Ordering from overseas to ${marketName}? Pay with an international card — see `;
  const abroadLinkLabel = isTh
    ? 'วิธีส่งดอกไม้ไปประเทศไทยจากต่างประเทศ'
    : 'how to send flowers to Thailand from abroad';

  return (
    <div className="market-flower-delivery-page">
      <Hero
        lang={lang}
        heroImageUrl={heroImageUrl}
        carouselImages={carouselImages}
        titleOverride={marketH1}
        browseCollectionHref="#bouquets"
      />
      <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '0.5rem' }}>
        <p className="guide-section-lede" style={{ textAlign: 'center', margin: 0 }}>
          {abroadNote}
          <Link href={abroadHref} className="guide-browse-link">
            {abroadLinkLabel}
          </Link>
          {isTh ? '' : '.'}
        </p>
      </div>
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
