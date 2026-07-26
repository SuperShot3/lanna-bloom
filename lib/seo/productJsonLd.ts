import type { Bouquet } from '@/lib/bouquets';
import { getBaseUrl } from '@/lib/siteUrl';

function lowestAvailablePriceThb(bouquet: Bouquet): number {
  const prices = bouquet.sizes
    .filter((s) => s.availability !== false)
    .map((s) => s.price)
    .filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length) return Math.min(...prices);
  return bouquet.sizes[0]?.price ?? 0;
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

function productImages(bouquet: Bouquet, base: string): string[] {
  return bouquet.images
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
  const images = productImages(bouquet, base);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description || name,
    ...(images.length ? { image: images } : {}),
    brand: {
      '@type': 'Brand',
      name: 'Lanna Bloom',
    },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'THB',
      price: lowestAvailablePriceThb(bouquet),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Lanna Bloom',
      },
    },
  };
}
