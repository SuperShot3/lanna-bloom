import { Hero } from '@/components/Hero';
import { HomeBottomCta } from '@/components/HomeBottomCta';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { Suspense } from 'react';

/** Regenerate every 60s so popular flowers shuffle on each update */
export const revalidate = 60;

export default function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  return (
    <>
      <Hero lang={lang as Locale} />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang as Locale} />
      </Suspense>
      <ReviewsSection lang={lang as Locale} />
      <HomeBottomCta lang={lang as Locale} />
    </>
  );
}
