import { Hero } from '@/components/Hero';
import { HomeBottomCta } from '@/components/HomeBottomCta';
import { StickyHomeCta } from '@/components/StickyHomeCta';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { Suspense } from 'react';

export default function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  return (
    <>
      <Hero lang={lang as Locale} />
      <div id="hero-sentinel" aria-hidden style={{ height: 1, marginTop: -1, pointerEvents: 'none' }} />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang as Locale} />
      </Suspense>
      <HomeBottomCta lang={lang as Locale} />
      <StickyHomeCta lang={lang as Locale} />
    </>
  );
}
