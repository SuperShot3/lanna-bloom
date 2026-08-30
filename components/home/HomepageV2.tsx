import { Hero } from '@/components/Hero';
import { HomePromoBanner } from '@/components/home/HomePromoBanner';
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
} from '@/lib/catalogReads';
import { buildCatalogSearchString } from '@/lib/catalogFilterParams';
import { translations, type Locale } from '@/lib/i18n';
import { destinationDisplayName } from '@/lib/delivery/markets';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HomeFaq = dynamic(
  () => import('@/components/home/HomeFaq').then((m) => m.HomeFaq),
  { ssr: true }
);

const GIFT_CATEGORY_IMAGES: Record<'plushy_toys' | 'balloons', string> = {
  plushy_toys: '/icons/category_icons/Teddy_bears_category_image.webp',
  balloons: '/icons/category_icons/balloons_category_image.webp',
};

function loadGiftCategoryCards(lang: Locale): GiftCategoryCardData[] {
  const catalogBase = `/${lang}/catalog`;
  const tHome = translations[lang].home;

  return [
    {
      categoryKey: 'plushy_toys',
      href: `${catalogBase}${buildCatalogSearchString({ topCategory: 'plushy_toys' })}`,
      imageUrl: GIFT_CATEGORY_IMAGES.plushy_toys,
      title: tHome.giftTeddyTitle,
      cta: tHome.giftTeddyCta,
    },
    {
      categoryKey: 'balloons',
      href: `${catalogBase}${buildCatalogSearchString({ topCategory: 'balloons' })}`,
      imageUrl: GIFT_CATEGORY_IMAGES.balloons,
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
  const { heroImageUrl, carouselImages, faqItems, jsonLd, lcpImageSrc } =
    await loadHomePageChrome(lang);
  const giftCards = loadGiftCategoryCards(lang);

  return (
    <>
      <HomeDocumentHead lcpImageSrc={lcpImageSrc} jsonLd={jsonLd} />
      <Hero
        lang={lang}
        heroImageUrl={heroImageUrl}
        carouselImages={carouselImages}
        sublineOverride={t.hero.subline}
      />
      <HomePromoBanner lang={lang} />
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
