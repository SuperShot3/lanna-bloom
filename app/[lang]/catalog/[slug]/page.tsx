import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/orders';
import { resolveProductOgImage } from '@/lib/seo/productJsonLd';
import { buildAlternates } from '@/lib/seo/alternates';
import { renderCatalogProductPage } from './renderCatalogProductPage';
import {
  getCatalogBalloonBySlug,
  getCatalogBouquetBySlug,
  getCatalogBouquets,
  getCatalogPlushyToyBySlug,
  getCatalogProductBySlug,
} from '@/lib/catalogReads';
import { isValidLocale, locales } from '@/lib/i18n';
import { getMarketByPathSlug } from '@/lib/delivery/markets';
import type { CatalogProduct } from '@/lib/catalog/types';

function pdpMetadata(opts: {
  lang: string;
  slug: string;
  name: string;
  description: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  images: string[];
  imageAlt?: string;
}): Metadata {
  const isTh = opts.lang === 'th';
  const title =
    opts.seoTitle?.trim() ||
    `${opts.name} | Flower delivery Chiang Mai | Lanna Bloom`;
  const description =
    opts.seoDescription?.trim() ||
    opts.description.trim().slice(0, 160) ||
    (isTh
      ? `สั่ง${opts.name} พร้อมจัดส่งในเชียงใหม่`
      : `Order ${opts.name} with flower delivery in Chiang Mai.`);
  const canonical = `${getBaseUrl()}/${opts.lang}/catalog/${opts.slug}`;
  const ogImage = resolveProductOgImage(opts.images, { alt: opts.imageAlt || opts.name });
  return {
    title,
    description,
    alternates: buildAlternates({
      lang: opts.lang,
      pathSuffix: `/catalog/${opts.slug}`,
      canonical,
    }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      ...(ogImage
        ? { images: [{ url: ogImage.url, ...(ogImage.alt ? { alt: ogImage.alt } : {}) }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

// Revalidate product pages every 60 seconds so catalog updates appear without rebuild
export const revalidate = 60;

export async function generateStaticParams() {
  const bouquets = await getCatalogBouquets();
  return locales.flatMap((lang) =>
    bouquets.map((b) => ({ lang, slug: b.slug }))
  );
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  if (!isValidLocale(params.lang)) return {};
  if (getMarketByPathSlug(params.slug)) return {};

  const isTh = params.lang === 'th';
  const [bouquet, plushyToy, balloon, product] = await Promise.all([
    getCatalogBouquetBySlug(params.slug, params.lang),
    getCatalogPlushyToyBySlug(params.slug, params.lang),
    getCatalogBalloonBySlug(params.slug, params.lang),
    getCatalogProductBySlug(params.slug, params.lang),
  ]);

  if (bouquet) {
    const name = isTh ? bouquet.nameTh : bouquet.nameEn;
    return pdpMetadata({
      lang: params.lang,
      slug: bouquet.slug,
      name,
      description: isTh ? bouquet.descriptionTh : bouquet.descriptionEn,
      seoTitle: isTh ? bouquet.seoTitleTh : bouquet.seoTitleEn,
      seoDescription: isTh ? bouquet.seoDescriptionTh : bouquet.seoDescriptionEn,
      images: bouquet.images,
      imageAlt: bouquet.imageAlts?.[0] || name,
    });
  }

  const catalogProduct: CatalogProduct | null = plushyToy ?? balloon ?? product;
  if (!catalogProduct) return {};

  const name =
    isTh && catalogProduct.nameTh?.trim()
      ? catalogProduct.nameTh
      : catalogProduct.nameEn;
  const description =
    (isTh ? catalogProduct.descriptionTh : catalogProduct.descriptionEn) || '';
  return pdpMetadata({
    lang: params.lang,
    slug: catalogProduct.slug,
    name,
    description,
    images: catalogProduct.images,
    imageAlt: catalogProduct.imageAlts?.[0] || name,
  });
}

export default async function ProductPage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  return renderCatalogProductPage({ params });
}
