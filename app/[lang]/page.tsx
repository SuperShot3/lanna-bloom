import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { PartnersCarousel } from '@/components/PartnersCarousel';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { OccasionsSection } from '@/components/home/OccasionsSection';
import { DeliverySection } from '@/components/home/DeliverySection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { HomeFaq } from '@/components/home/HomeFaq';
import { ExploreLinksSection } from '@/components/home/ExploreLinksSection';
import {
  getHomeFaqItems,
  fillDeliveryTimePlaceholders,
} from '@/components/home/homeLandingContent';
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  buildFaqPageJsonLd,
} from '@/lib/seo/siteJsonLd';
import { getHeroImageFromSanity, getHeroCarouselImagesFromSanity } from '@/lib/sanity';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { Suspense } from 'react';

/** Regenerate every 60s so popular catalog items shuffle on each update */
export const revalidate = 60;

const OG_IMAGE_PATH = '/HeroImage/heroimage.webp';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const base = getBaseUrl();
  const canonical = `${base}/${params.lang}`;
  const languages = {
    en: `${base}/en`,
    th: `${base}/th`,
    'x-default': `${base}/en`,
  };
  const isTh = params.lang === 'th';
  const title = isTh
    ? 'ส่งดอกไม้เชียงใหม่ — สั่งดอกไม้ออนไลน์ | Lanna Bloom'
    : 'Flower Delivery Chiang Mai — Order Flowers Online | Lanna Bloom';
  const description = fillDeliveryTimePlaceholders(
    isTh
      ? 'สั่งดอกไม้ออนไลน์ในเชียงใหม่ จัดส่งวันเดียวเมื่อสั่งก่อน {cutoff} น. ช่อดอกไม้สดจัดโดยร้านดอกไม้ท้องถิ่น ชำระเงินปลอดภัย ส่งถึงบ้าน โรงแรม และคอนโดทั่วเชียงใหม่'
      : 'Order flowers online for delivery in Chiang Mai. Same-day delivery when you order by {cutoff} — fresh bouquets by local florists, secure checkout, delivery to homes, hotels, and condos.'
  );
  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Lanna Bloom',
      type: 'website',
      images: [{ url: `${base}${OG_IMAGE_PATH}` }],
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Locale = isValidLocale(params.lang) ? params.lang : 'en';
  const [heroImageUrl, carouselImages] = await Promise.all([
    getHeroImageFromSanity(),
    getHeroCarouselImagesFromSanity(),
  ]);
  const faqItems = getHomeFaqItems(lang);
  const jsonLd = [
    buildOrganizationJsonLd(),
    buildWebSiteJsonLd(),
    buildFaqPageJsonLd(faqItems),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero lang={lang} heroImageUrl={heroImageUrl} carouselImages={carouselImages} />
      <HomeRevealInit />
      <Suspense fallback={<PopularSectionSkeleton />}>
        <PopularSection lang={lang} />
      </Suspense>
      <OccasionsSection lang={lang} />
      <WhyUsSection lang={lang} />
      <DeliverySection lang={lang} />
      <Suspense fallback={null}>
        <PartnersCarousel lang={lang} />
      </Suspense>
      <ReviewsSection lang={lang} />
      <HomeFaq lang={lang} faq={faqItems} />
      <ExploreLinksSection lang={lang} />
    </>
  );
}
