import { Hero } from '@/components/Hero';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ExperienceSection } from '@/components/ExperienceSection';
import { PartnersCarousel } from '@/components/PartnersCarousel';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { getHeroImageFromSanity, getHeroCarouselImagesFromSanity } from '@/lib/sanity';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { Suspense } from 'react';

/** Regenerate every 60s so popular flowers shuffle on each update */
export const revalidate = 60;

export default async function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  const [heroImageUrl, carouselImages] = await Promise.all([
    getHeroImageFromSanity(),
    getHeroCarouselImagesFromSanity(),
  ]);
  return (
    <>
      <Hero lang={lang as Locale} heroImageUrl={heroImageUrl} carouselImages={carouselImages} />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang as Locale} />
      </Suspense>
      <ExperienceSection lang={lang as Locale} />
      <Suspense fallback={null}>
        <PartnersCarousel lang={lang as Locale} />
      </Suspense>
      <ReviewsSection lang={lang as Locale} />
    </>
  );
}
