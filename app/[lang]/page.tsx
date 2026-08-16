import type { Metadata } from 'next';
import { Hero } from '@/components/Hero';
import { HomeRevealInit } from '@/components/home/HomeRevealInit';
import { PopularSection } from '@/components/PopularSection';
import { PopularSectionSkeleton } from '@/components/PopularSectionSkeleton';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { DeliverySection } from '@/components/home/DeliverySection';
import { LocalLandingSection } from '@/components/home/LocalLandingSection';
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
  HERO_LCP_PRELOAD_WIDTH,
  isStorefrontRenderableImageUrl,
} from '@/lib/catalog/catalogImage';
import { getBaseUrl } from '@/lib/orders';
import { isValidLocale, locales, type Locale } from '@/lib/i18n';
import { buildAlternates } from '@/lib/seo/alternates';
import {
  openGraphLocale,
  websiteOpenGraph,
  websiteTwitter,
} from '@/lib/seo/shareMetadata';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

/** Regenerate every 60s so popular catalog items shuffle on each update */
export const revalidate = 60;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const HomeFaq = dynamic(
  () => import('@/components/home/HomeFaq').then((m) => m.HomeFaq),
  { ssr: true }
);

const OG_IMAGE_PATH = '/HeroImage/heroimage.webp';

const HOME_SEO = {
  en: {
    title: 'Buy Flowers Online in Chiang Mai | Same-Day Delivery – Lanna Bloom',
    description:
      'Buy flowers online in Chiang Mai with secure card payment. Choose a bouquet, add your message, and arrange same-day delivery to homes, hotels, condos, hospitals, or villas.',
  },
  th: {
    title: 'ซื้อดอกไม้ออนไลน์ในเชียงใหม่ | จัดส่งวันเดียว – Lanna Bloom',
    description:
      'ซื้อดอกไม้ออนไลน์ในเชียงใหม่ ชำระด้วยบัตรอย่างปลอดภัย เลือกช่อ ใส่ข้อความ และจัดส่งวันเดียวถึงบ้าน โรงแรม คอนโด โรงพยาบาล หรือวิลล่า',
  },
  'zh-hk': {
    title: '網上購買清邁鮮花 | 即日配送 – Lanna Bloom',
    description:
      '在清邁網上訂購鮮花，以信用卡安全付款。選擇花束、加上訊息，即可安排即日送達住宅、酒店、公寓、醫院或別墅。',
  },
} as const;

function homeSeoForLang(lang: Locale): { title: string; description: string } {
  if (lang === 'th') return HOME_SEO.th;
  if (lang === 'zh-hk') return HOME_SEO['zh-hk'];
  return HOME_SEO.en;
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  const lang = params.lang as Locale;
  const base = getBaseUrl();
  const { title, description } = homeSeoForLang(lang);
  const alternates = buildAlternates({ lang, pathSuffix: '' });
  const canonical =
    typeof alternates.canonical === 'string' ? alternates.canonical : `${base}/${lang}`;
  return {
    title,
    description,
    alternates,
    openGraph: websiteOpenGraph({
      title,
      description,
      url: canonical,
      locale: openGraphLocale(lang),
    }),
    twitter: websiteTwitter({ title, description }),
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
