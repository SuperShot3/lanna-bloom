import { getHomeFaqItems, type HomeFaqItem } from '@/components/home/homeLandingContent';
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
import type { Locale } from '@/lib/i18n';

const OG_IMAGE_PATH = '/HeroImage/heroimage.webp';

export type HomePageChrome = {
  heroImageUrl: string;
  carouselImages: { src: string; alt: string }[];
  faqItems: HomeFaqItem[];
  jsonLd: unknown[];
  lcpPreloadHref: string | null;
};

export async function loadHomePageChrome(lang: Locale): Promise<HomePageChrome> {
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
  return { heroImageUrl, carouselImages, faqItems, jsonLd, lcpPreloadHref };
}

export function HomeDocumentHead({
  lcpPreloadHref,
  jsonLd,
}: {
  lcpPreloadHref: string | null;
  jsonLd: unknown[];
}) {
  return (
    <>
      {lcpPreloadHref ? (
        <link rel="preload" as="image" href={lcpPreloadHref} fetchPriority="high" />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
