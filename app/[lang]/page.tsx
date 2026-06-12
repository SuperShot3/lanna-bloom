import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ExperienceSection } from '@/components/ExperienceSection';
import { PartnersCarousel } from '@/components/PartnersCarousel';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { getHeroImageFromSanity, getHeroCarouselImagesFromSanity } from '@/lib/sanity';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { Suspense } from 'react';

/** Regenerate every 60s so popular catalog items shuffle on each update */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const base = getBaseUrl();
  const canonical = `${base}/${params.lang}`;
  if (params.lang === 'th') {
    return {
      title: 'Lanna Bloom | ส่งดอกไม้และของขวัญ เชียงใหม่',
      description:
        'บริการส่งดอกไม้และของขวัญพรีเมียมในเชียงใหม่ สั่งออนไลน์ชำระเงินปลอดภัย จัดส่งวันเดียวได้ตามเงื่อนไข และจัดส่งช่อในจุดหมายที่เลือกทั่วประเทศไทย',
      alternates: { canonical },
    };
  }
  return {
    title: 'Lanna Bloom | Flower & gift delivery Chiang Mai',
    description:
      'Premium flower and gift delivery in Chiang Mai, Thailand. Order online with secure checkout — same-day delivery when available. Bouquet delivery in Phuket, Hua Hin, Koh Samui, Krabi & Ao Nang, and Pattaya.',
    alternates: { canonical },
  };
}

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
      <HomeRevealInit />
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
