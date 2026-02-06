import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/orders';
import { getBouquetsFromSanity } from '@/lib/sanity';
import { locales } from '@/lib/i18n';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  const staticPaths: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...locales.flatMap((lang) => [
      { url: `${base}/${lang}`, changeFrequency: 'daily', priority: 1 },
      { url: `${base}/${lang}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    ]),
  ];

  let bouquets: { slug: string }[] = [];
  try {
    bouquets = await getBouquetsFromSanity();
  } catch {
    // continue without product URLs
  }

  const productPaths: MetadataRoute.Sitemap = locales.flatMap((lang) =>
    bouquets.map((b) => ({
      url: `${base}/${lang}/catalog/${encodeURIComponent(b.slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  return [...staticPaths, ...productPaths];
}
