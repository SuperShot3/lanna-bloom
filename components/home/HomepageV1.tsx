import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { DeliverySection } from '@/components/home/DeliverySection';
import { LocalLandingSection } from '@/components/home/LocalLandingSection';
import { ExperienceSection } from '@/components/ExperienceSection';
import {
  HomeDocumentHead,
  loadHomePageChrome,
} from '@/components/home/loadHomePageChrome';
import type { Locale } from '@/lib/i18n';
import { destinationDisplayName } from '@/lib/delivery/markets';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HomeFaq = dynamic(
  () => import('@/components/home/HomeFaq').then((m) => m.HomeFaq),
  { ssr: true }
);

/** Previous homepage composer. Kept unreferenced for a one-line rollback. */
export async function HomepageV1({ lang }: { lang: Locale }) {
  const { heroImageUrl, carouselImages, faqItems, jsonLd, lcpImageSrc } =
    await loadHomePageChrome(lang);

  return (
    <>
      <HomeDocumentHead lcpImageSrc={lcpImageSrc} jsonLd={jsonLd} />
      <Hero lang={lang} heroImageUrl={heroImageUrl} carouselImages={carouselImages} />
      <HomeRevealInit />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang} />
      </Suspense>
      <ExperienceSection
        lang={lang}
        locationName={destinationDisplayName('CHIANG_MAI', lang)}
        timing="same_day"
      />
      <DeliverySection lang={lang} />
      <ReviewsSection lang={lang} />
      <LocalLandingSection lang={lang} />
      <HomeFaq lang={lang} faq={faqItems} />
    </>
  );
}
