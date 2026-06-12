import type { Bouquet } from '@/lib/bouquets';
import { getBaseUrl } from '@/lib/orders';

function lowestAvailablePriceThb(bouquet: Bouquet): number {
  const prices = bouquet.sizes
    .filter((s) => s.availability !== false)
    .map((s) => s.price)
    .filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length) return Math.min(...prices);
  return bouquet.sizes[0]?.price ?? 0;
}

function productImages(bouquet: Bouquet, base: string): string[] {
  return bouquet.images
    .filter((url) => url.startsWith('http'))
    .slice(0, 5)
    .map((url) => (url.startsWith('http') ? url : `${base}${url}`));
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
