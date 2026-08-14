import type { Bouquet } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import type { CatalogProduct } from '@/lib/catalog/types';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import { getBaseUrl } from '@/lib/siteUrl';

const BRAND = {
  '@type': 'Brand',
  name: 'Lanna Bloom',
} as const;

const SELLER = {
  '@type': 'Organization',
  name: 'Lanna Bloom',
} as const;

const AREA_SERVED_THAILAND = {
  '@type': 'Country',
  name: 'Thailand',
} as const;

function offerAvailability(available: boolean | undefined): string {
  return available !== false
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function schemaOffer(opts: {
  url: string;
  price: number;
  sku: string;
  availability?: boolean;
}): Record<string, unknown> {
  return {
    '@type': 'Offer',
    url: opts.url,
    priceCurrency: 'THB',
    price: opts.price,
    sku: opts.sku,
    availability: offerAvailability(opts.availability),
    itemCondition: 'https://schema.org/NewCondition',
    seller: SELLER,
  };
}

function pricedOptions(sizes: BouquetSellableOption[] | undefined): BouquetSellableOption[] {
  return (sizes ?? []).filter((s) => Number.isFinite(s.price) && s.price > 0 && Boolean(s.optionId?.trim()));
}

function buildOffers(
  options: BouquetSellableOption[],
  discountPercent: number | undefined,
  pageUrl: string,
  productId: string
): Record<string, unknown> | Record<string, unknown>[] {
  const offers = options.map((option) =>
    schemaOffer({
      url: pageUrl,
      price: applyCatalogDiscountThb(option.price, discountPercent),
      sku: `${productId}_${option.optionId}`,
      availability: option.availability,
    })
  );
  if (offers.length === 1) return offers[0]!;
  return offers;
}

/** Absolute http(s) image URL suitable for OG/Twitter/schema (skips data: placeholders). */
export function resolveProductOgImage(
  images: string[],
  options?: { alt?: string; baseUrl?: string }
): { url: string; alt?: string } | undefined {
  const base = (options?.baseUrl ?? getBaseUrl()).replace(/\/$/, '');
  for (const raw of images) {
    const url = raw?.trim();
    if (!url || url.startsWith('data:')) continue;
    const absolute =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `${base}${url.startsWith('/') ? url : `/${url}`}`;
    if (!absolute.startsWith('http://') && !absolute.startsWith('https://')) continue;
    const alt = options?.alt?.trim();
    return alt ? { url: absolute, alt } : { url: absolute };
  }
  return undefined;
}

function productImages(images: string[], base: string): string[] {
  return images
    .map((url) => resolveProductOgImage([url], { baseUrl: base })?.url)
    .filter((url): url is string => Boolean(url))
    .slice(0, 5);
}

export function buildBouquetProductJsonLd(
  bouquet: Bouquet,
  lang: 'en' | 'th',
  pageUrl: string
): Record<string, unknown> {
  const base = getBaseUrl();
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const description = (lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn).trim().slice(0, 500);
  const images = productImages(bouquet.images, base);
  const options = pricedOptions(bouquet.sizes);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description || name,
    ...(images.length ? { image: images } : {}),
    brand: BRAND,
    areaServed: AREA_SERVED_THAILAND,
    ...(options.length
      ? { offers: buildOffers(options, bouquet.discountPercent, pageUrl, bouquet.id) }
      : {}),
  };
}

export function buildCatalogProductJsonLd(
  product: CatalogProduct,
  lang: 'en' | 'th',
  pageUrl: string
): Record<string, unknown> {
  const base = getBaseUrl();
  const name =
    lang === 'th' && product.nameTh?.trim() ? product.nameTh : product.nameEn;
  const rawDescription = lang === 'th' ? product.descriptionTh : product.descriptionEn;
  const description = (rawDescription ?? '').trim().slice(0, 500);
  const images = productImages(product.images, base);

  const fromSizes = pricedOptions(product.sizes);
  const options: BouquetSellableOption[] =
    fromSizes.length > 0
      ? fromSizes
      : product.price > 0
        ? [
            {
              optionId: 'default',
              price: product.price,
              label: product.sizeLabel ?? '',
              availability: true,
            },
          ]
        : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description || name,
    ...(images.length ? { image: images } : {}),
    brand: BRAND,
    areaServed: AREA_SERVED_THAILAND,
    ...(options.length
      ? { offers: buildOffers(options, product.discountPercent, pageUrl, product.id) }
      : {}),
  };
}
