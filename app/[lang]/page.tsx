import { Hero } from '@/components/Hero';
import { FilterPills } from '@/components/FilterPills';
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
      <FilterPills lang={lang as Locale} currentCategory="all" />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang as Locale} />
      </Suspense>
    </>
  );
}
