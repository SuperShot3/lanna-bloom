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
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const HomeFaq = dynamic(
  () => import('@/components/home/HomeFaq').then((m) => m.HomeFaq),
  { ssr: true }
);

/** Current production homepage. Do not substantially change this composer. */
export async function HomepageV1({ lang }: { lang: Locale }) {
  const { heroImageUrl, carouselImages, faqItems, jsonLd, lcpPreloadHref } =
    await loadHomePageChrome(lang);

  return (
    <>
      <HomeDocumentHead lcpPreloadHref={lcpPreloadHref} jsonLd={jsonLd} />
      <Hero lang={lang} heroImageUrl={heroImageUrl} carouselImages={carouselImages} />
      <HomeRevealInit />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang} />
      </Suspense>
      <ExperienceSection lang={lang} />
      <DeliverySection lang={lang} />
      <ReviewsSection lang={lang} />
      <LocalLandingSection lang={lang} />
      <HomeFaq lang={lang} faq={faqItems} />
    </>
  );
}
