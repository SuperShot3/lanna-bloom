import { getImageProps } from 'next/image';
import { getHomeFaqItems, type HomeFaqItem } from '@/components/home/homeLandingContent';
import {
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/seo/siteJsonLd';
import { getCatalogHeroImage, getCatalogHeroCarouselImages } from '@/lib/catalogReads';
import {
  catalogImageUnoptimized,
  catalogOptimizedImageUrl,
  HERO_CAROUSEL_IMAGE_SIZES,
  HERO_LCP_IMAGE_QUALITY,
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
  lcpImageSrc: string | null;
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
  const lcpImageSrc =
    carouselImages?.[0]?.src ||
    heroImageUrl ||
    (isStorefrontRenderableImageUrl(OG_IMAGE_PATH) ? OG_IMAGE_PATH : null);
  return { heroImageUrl, carouselImages, faqItems, jsonLd, lcpImageSrc };
}

function HeroLcpPreload({ src }: { src: string }) {
  if (catalogImageUnoptimized(src)) {
    return <link rel="preload" as="image" href={src} fetchPriority="high" />;
  }

  const {
    props: { src: href, srcSet, sizes },
  } = getImageProps({
    src,
    alt: '',
    fill: true,
    sizes: HERO_CAROUSEL_IMAGE_SIZES,
    quality: HERO_LCP_IMAGE_QUALITY,
  });

  return (
    <link
      rel="preload"
      as="image"
      href={href || catalogOptimizedImageUrl(src, HERO_LCP_PRELOAD_WIDTH, HERO_LCP_IMAGE_QUALITY)}
      imageSrcSet={srcSet}
      imageSizes={sizes ?? HERO_CAROUSEL_IMAGE_SIZES}
      fetchPriority="high"
    />
  );
}

export function HomeDocumentHead({
  lcpImageSrc,
  jsonLd,
}: {
  lcpImageSrc: string | null;
  jsonLd: unknown[];
}) {
  return (
    <>
      {lcpImageSrc ? <HeroLcpPreload src={lcpImageSrc} /> : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
