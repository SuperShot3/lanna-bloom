// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/orders';
import { getBouquetsFromSanity } from '@/lib/sanity';
import { locales } from '@/lib/i18n';

type BouquetForSitemap = { slug: string; updatedAt?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date().toISOString();

  const staticPaths = [
    {
      url: base,
      changeFrequency: 'daily' as const,
      priority: 1 as const,
      lastModified: now,
    },

    ...locales.flatMap((lang) => [
      {
        url: `${base}/${lang}`,
        changeFrequency: 'daily' as const,
        priority: 1 as const,
        lastModified: now,
      },
      {
        url: `${base}/${lang}/catalog`,
        changeFrequency: 'daily' as const,
        priority: 0.9 as const,
        lastModified: now,
      },
      {
        url: `${base}/${lang}/refund-replacement`,
        changeFrequency: 'monthly' as const,
        priority: 0.5 as const,
        lastModified: now,
      },
      {
        url: `${base}/${lang}/contact`,
        changeFrequency: 'monthly' as const,
        priority: 0.5 as const,
        lastModified: now,
      },
      {
        url: `${base}/${lang}/guides/flowers-chiang-mai`,
        changeFrequency: 'monthly' as const,
        priority: 0.6 as const,
        lastModified: now,
      },
      {
        url: `${base}/${lang}/guides/rose-bouquets-chiang-mai`,
        changeFrequency: 'monthly' as const,
        priority: 0.6 as const,
        lastModified: now,
      },
      {
        url: `${base}/${lang}/guides/same-day-flower-delivery-chiang-mai`,
        changeFrequency: 'monthly' as const,
        priority: 0.6 as const,
        lastModified: now,
      },
    ]),
  ] satisfies MetadataRoute.Sitemap;

  let bouquets: BouquetForSitemap[] = [];
  try {
    bouquets = (await getBouquetsFromSanity()) as BouquetForSitemap[];
  } catch {
    bouquets = [];
  }

  const productPaths = locales.flatMap((lang) =>
    bouquets.map((b) => ({
      url: `${base}/${lang}/catalog/${b.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8 as const,
      lastModified: b.updatedAt ? new Date(b.updatedAt).toISOString() : now,
    }))
  ) satisfies MetadataRoute.Sitemap;

  return [...staticPaths, ...productPaths];
}
