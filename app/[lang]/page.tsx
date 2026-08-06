import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { DeliverySection } from '@/components/home/DeliverySection';
import { LocalLandingSection } from '@/components/home/LocalLandingSection';
import { HomeFaq } from '@/components/home/HomeFaq';
import { getHomeFaqItems } from '@/components/home/homeLandingContent';
import { ExperienceSection } from '@/components/ExperienceSection';
import {
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo/siteJsonLd';
import { getCatalogHeroImage, getCatalogHeroCarouselImages } from '@/lib/catalogReads';
import {
  catalogOptimizedImageUrl,
  isStorefrontRenderableImageUrl,
} from '@/lib/catalog/catalogImage';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { Suspense } from 'react';

/** Regenerate every 60s so popular catalog items shuffle on each update */
export const revalidate = 60;

const OG_IMAGE_PATH = '/HeroImage/heroimage.webp';
/** Match hero carousel mobile card width for LCP preload. */
const HERO_LCP_PRELOAD_WIDTH = 384;

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
  // Phase 3a: keep Chiang Mai primary title for ranking protection.
  const title = isTh
    ? 'ซื้อดอกไม้ออนไลน์ในเชียงใหม่ | จัดส่งวันเดียว – Lanna Bloom'
    : 'Buy Flowers Online in Chiang Mai | Same-Day Delivery – Lanna Bloom';
  const description = isTh
    ? 'ซื้อดอกไม้ออนไลน์ในเชียงใหม่ ชำระด้วยบัตรอย่างปลอดภัย เลือกช่อ ใส่ข้อความ และจัดส่งวันเดียวถึงบ้าน โรงแรม คอนโด โรงพยาบาล หรือวิลล่า'
    : 'Buy flowers online in Chiang Mai with secure card payment. Choose a bouquet, add your message, and arrange same-day delivery to homes, hotels, condos, hospitals, or villas.';
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
    getCatalogHeroImage(),
    getCatalogHeroCarouselImages(),
  ]);
  const faqItems = getHomeFaqItems(lang);
  const jsonLd = [
    buildOrganizationJsonLd(),
    buildWebSiteJsonLd(),
    buildFaqPageJsonLd(faqItems),
  ];
  const lcpSrc =
    carouselImages?.[0]?.src ||
    heroImageUrl ||
    (isStorefrontRenderableImageUrl(OG_IMAGE_PATH) ? OG_IMAGE_PATH : null);
  const lcpPreloadHref = lcpSrc
    ? catalogOptimizedImageUrl(lcpSrc, HERO_LCP_PRELOAD_WIDTH, 70)
    : null;
  return (
    <>
      {lcpPreloadHref ? (
        <link
          rel="preload"
          as="image"
          href={lcpPreloadHref}
          fetchPriority="high"
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
