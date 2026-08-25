import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { PopularPicksRow, HOME_POPULAR_ROW_LIMIT } from '@/components/home/PopularPicksRow';
import { ShopByOccasionTiles } from '@/components/home/ShopByOccasionTiles';
import { ShopByFlowerTypeTiles } from '@/components/home/ShopByFlowerTypeTiles';
import {
  GiftCategoryCards,
  type GiftCategoryCardData,
} from '@/components/home/GiftCategoryCards';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { DeliverySection } from '@/components/home/DeliverySection';
import { LocalLandingSection } from '@/components/home/LocalLandingSection';
import { ExperienceSection } from '@/components/ExperienceSection';
import {
  HomeDocumentHead,
  loadHomePageChrome,
} from '@/components/home/loadHomePageChrome';
import {
  getCatalogHomeFlowerTypeTiles,
  getCatalogHomeOccasionTiles,
  getCatalogPopularBouquets,
  getCatalogProductsFiltered,
} from '@/lib/catalogReads';
import { firstStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';
import { destinationDisplayName } from '@/lib/delivery/markets';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HomeFaq = dynamic(
  () => import('@/components/home/HomeFaq').then((m) => m.HomeFaq),
  { ssr: true }
);

const GIFT_FALLBACK_IMAGES: Record<'plushy_toys' | 'balloons', string> = {
  plushy_toys: '/icons/category_icons/teadybear_category_icon.webp?v=2',
  balloons: '/icons/category_icons/Ballons_category_icon.webp?v=2',
};

async function loadGiftCategoryCards(lang: Locale): Promise<GiftCategoryCardData[]> {
  const catalogBase = `/${lang}/catalog`;
  const tHome = translations[lang].home;
  const [toys, balloons] = await Promise.all([
    getCatalogProductsFiltered({ categoryKey: 'plushy_toys', sort: 'newest' }),
    getCatalogProductsFiltered({ categoryKey: 'balloons', sort: 'newest' }),
  ]);

  const toyImage =
    firstStorefrontRenderableImageUrl(toys[0]?.images) ?? GIFT_FALLBACK_IMAGES.plushy_toys;
  const balloonImage =
    firstStorefrontRenderableImageUrl(balloons[0]?.images) ?? GIFT_FALLBACK_IMAGES.balloons;

  return [
    {
      categoryKey: 'plushy_toys',
      href: `${catalogBase}${buildCatalogSearchString({ topCategory: 'plushy_toys' })}`,
      imageUrl: toyImage,
      title: tHome.giftTeddyTitle,
      cta: tHome.giftTeddyCta,
    },
    {
      categoryKey: 'balloons',
      href: `${catalogBase}${buildCatalogSearchString({ topCategory: 'balloons' })}`,
      imageUrl: balloonImage,
      title: tHome.giftBalloonsTitle,
      cta: tHome.giftBalloonsCta,
    },
  ];
}

async function HomeBrowseV2({ lang }: { lang: Locale }) {
  const catalogBase = `/${lang}/catalog`;
  const tHome = translations[lang].home;
  const [popularBouquets, occasionTiles, flowerTypeTiles] = await Promise.all([
    getCatalogPopularBouquets(HOME_POPULAR_ROW_LIMIT),
    getCatalogHomeOccasionTiles(),
    getCatalogHomeFlowerTypeTiles(),
  ]);

  if (
    popularBouquets.length === 0 &&
    occasionTiles.length === 0 &&
    flowerTypeTiles.length === 0
  ) {
    return null;
  }

  return (
    <section
      className="pt-4 pb-12 sm:pt-5 sm:pb-14 lg:pt-6 lg:pb-16 bg-stone-50"
      aria-label={tHome.popularTitle}
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 home-reveal-stagger">
        <PopularPicksRow
          title={tHome.popularTitle}
          href={catalogBase}
          bouquets={popularBouquets}
          lang={lang}
          showMoreLabel={tHome.viewAllBouquets}
          ctaEvent="cta_home_view_all_bouquets"
          showMorePremium
        />
        <ShopByOccasionTiles lang={lang} tiles={occasionTiles} catalogHref={catalogBase} />
        <ShopByFlowerTypeTiles lang={lang} tiles={flowerTypeTiles} catalogHref={catalogBase} />
      </div>
    </section>
  );
}

/** Guided homepage: fewer product grids, category navigation earlier. */
export async function HomepageV2({ lang }: { lang: Locale }) {
  const t = translations[lang];
  const [{ heroImageUrl, carouselImages, faqItems, jsonLd, lcpPreloadHref }, giftCards] =
    await Promise.all([loadHomePageChrome(lang), loadGiftCategoryCards(lang)]);

  return (
    <>
      <HomeDocumentHead lcpPreloadHref={lcpPreloadHref} jsonLd={jsonLd} />
      <Hero
        lang={lang}
        heroImageUrl={heroImageUrl}
        carouselImages={carouselImages}
        sublineOverride={t.hero.subline}
      />
      <HomeRevealInit />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <HomeBrowseV2 lang={lang} />
      </Suspense>
      <ExperienceSection
        lang={lang}
        locationName={destinationDisplayName('CHIANG_MAI', lang)}
        timing="same_day"
      />
      <GiftCategoryCards heading={t.home.giftsSectionTitle} cards={giftCards} />
      <DeliverySection lang={lang} />
      <ReviewsSection lang={lang} />
      <LocalLandingSection lang={lang} />
      <HomeFaq lang={lang} faq={faqItems} />
    </>
  );
}
