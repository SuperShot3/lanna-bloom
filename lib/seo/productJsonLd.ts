import type { Bouquet } from '@/lib/bouquets';
import type { BouquetSellableOption } from '@/lib/bouquetOptions';
import type { CatalogProduct } from '@/lib/catalog/types';
import { effectiveCatalogUnitPriceWithExpansion } from '@/lib/catalogDiscount';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { computeFinalPrice } from '@/lib/partnerPricing';
import { getBaseUrl, upgradeToHttps } from '@/lib/siteUrl';

const BRAND = {
  '@type': 'Brand',
  name: 'Lanna Bloom',
} as const;

export type ProductJsonLdContext = {
  destinationId?: DeliveryDestinationId;
};

function originFromPageUrl(pageUrl: string, fallbackBase: string): string {
  try {
    if (pageUrl.startsWith('http://') || pageUrl.startsWith('https://')) {
      return new URL(pageUrl).origin;
    }
  } catch {
    /* use fallback */
  }
  return fallbackBase.replace(/\/$/, '');
}

function seller(pageUrl: string, fallbackBase: string): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': `${originFromPageUrl(pageUrl, fallbackBase)}/#organization`,
    name: 'Lanna Bloom Flower Delivery',
  };
}

function offerAvailability(available: boolean | undefined): string {
  return available !== false
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

function offerPriceThb(
  basePriceThb: number,
  discountPercent: number | undefined,
  destinationId: DeliveryDestinationId
): number {
  return effectiveCatalogUnitPriceWithExpansion(
    basePriceThb,
    discountPercent,
    destinationId
  );
}

/**
 * Default size Googlebot / first-time visitors see.
 * Matches ProductPageClient when localStorage has no saved preference: sizes[0].
 */
export function defaultVisibleOption(
  sizes: BouquetSellableOption[] | undefined
): BouquetSellableOption | null {
  const first = sizes?.[0];
  if (first && Number.isFinite(first.price) && first.price > 0) return first;
  const priced = (sizes ?? []).find((s) => Number.isFinite(s.price) && s.price > 0);
  return priced ?? null;
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
    const resolved = url.startsWith('//') ? `https:${url}` : url;
    const absolute = upgradeToHttps(
      resolved.startsWith('http://') || resolved.startsWith('https://')
        ? resolved
        : `${base}${resolved.startsWith('/') ? resolved : `/${resolved}`}`
    );
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

function stripNullish(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map(stripNullish).filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = stripNullish(item);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
}

/** JSON-LD for a script tag: drop null/undefined and escape `<` so descriptions cannot break HTML. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(stripNullish(data)).replace(/</g, '\\u003c');
}

function buildProductJsonLd(opts: {
  name: string;
  description: string;
  images: string[];
  pageUrl: string;
  sku: string;
  option: BouquetSellableOption;
  discountPercent: number | undefined;
  destinationId: DeliveryDestinationId;
}): Record<string, unknown> | null {
  const price = offerPriceThb(opts.option.price, opts.discountPercent, opts.destinationId);
  if (!(price > 0)) return null;

  const base = getBaseUrl();
  const images = productImages(opts.images, base);
  const description = opts.description || opts.name;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description,
    url: opts.pageUrl,
    sku: opts.sku,
    ...(images.length ? { image: images } : {}),
    brand: BRAND,
    offers: {
      '@type': 'Offer',
      url: opts.pageUrl,
      priceCurrency: 'THB',
      price,
      availability: offerAvailability(opts.option.availability),
      itemCondition: 'https://schema.org/NewCondition',
      seller: seller(opts.pageUrl, base),
    },
  };
}

export function buildBouquetProductJsonLd(
  bouquet: Bouquet,
  lang: 'en' | 'th',
  pageUrl: string,
  context?: ProductJsonLdContext
): Record<string, unknown> | null {
  const option = defaultVisibleOption(bouquet.sizes);
  if (!option) return null;
  const name = lang === 'th' ? bouquet.nameTh : bouquet.nameEn;
  const description = (lang === 'th' ? bouquet.descriptionTh : bouquet.descriptionEn)
    .trim()
    .slice(0, 500);
  return buildProductJsonLd({
    name,
    description,
    images: bouquet.images,
    pageUrl,
    sku: bouquet.id,
    option,
    discountPercent: bouquet.discountPercent,
    destinationId: context?.destinationId ?? 'CHIANG_MAI',
  });
}

function catalogDefaultOption(product: CatalogProduct): BouquetSellableOption | null {
  const fromSizes = defaultVisibleOption(product.sizes);
  if (fromSizes) return fromSizes;
  const base = computeFinalPrice(product.cost ?? product.price, product.commissionPercent);
  if (!(base > 0)) return null;
  return {
    optionId: 'default',
    price: base,
    label: product.sizeLabel ?? '',
    availability: true,
  };
}

export function buildCatalogProductJsonLd(
  product: CatalogProduct,
  lang: 'en' | 'th',
  pageUrl: string,
  context?: ProductJsonLdContext
): Record<string, unknown> | null {
  const option = catalogDefaultOption(product);
  if (!option) return null;
  const name =
    lang === 'th' && product.nameTh?.trim() ? product.nameTh : product.nameEn;
  const rawDescription = lang === 'th' ? product.descriptionTh : product.descriptionEn;
  const description = (rawDescription ?? '').trim().slice(0, 500);
  return buildProductJsonLd({
    name,
    description,
    images: product.images,
    pageUrl,
    sku: product.id,
    option,
    discountPercent: product.discountPercent,
    destinationId: context?.destinationId ?? 'CHIANG_MAI',
  });
}

function singleOffer(node: Record<string, unknown>): Record<string, unknown> | null {
  const offers = node.offers;
  if (!offers || typeof offers !== 'object' || Array.isArray(offers)) return null;
  const offer = offers as Record<string, unknown>;
  return offer['@type'] === 'Offer' ? offer : null;
}

function hasAbsoluteImage(node: Record<string, unknown>): boolean {
  const image = node.image;
  const urls = Array.isArray(image) ? image : image ? [image] : [];
  return urls.some(
    (url) => typeof url === 'string' && /^https?:\/\//i.test(url) && !url.startsWith('data:')
  );
}

/** Google-first: one Product with one Offer object. Rejects ProductGroup and Offer arrays. */
export function isGoogleProductJsonLd(jsonLd: Record<string, unknown>): boolean {
  if (jsonLd['@type'] !== 'Product') return false;
  if ('hasVariant' in jsonLd || 'productGroupID' in jsonLd) return false;
  return singleOffer(jsonLd) != null;
}

/** Product snippet: name + a single Offer with a numeric price (reviews are optional). */
export function isProductSnippetEligible(jsonLd: Record<string, unknown>): boolean {
  if (!isGoogleProductJsonLd(jsonLd)) return false;
  const name = typeof jsonLd.name === 'string' && jsonLd.name.trim().length > 0;
  const offer = singleOffer(jsonLd);
  const price = offer && typeof offer.price === 'number' && Number.isFinite(offer.price);
  return name && Boolean(price);
}

/** Merchant listing: name + crawlable image + Offer with price > 0 and THB. */
export function isMerchantListingEligible(jsonLd: Record<string, unknown>): boolean {
  if (!isGoogleProductJsonLd(jsonLd)) return false;
  const name = typeof jsonLd.name === 'string' && jsonLd.name.trim().length > 0;
  const offer = singleOffer(jsonLd);
  const priceOk =
    offer &&
    typeof offer.price === 'number' &&
    Number.isFinite(offer.price) &&
    offer.price > 0;
  return name && hasAbsoluteImage(jsonLd) && Boolean(priceOk) && offer?.priceCurrency === 'THB';
}
