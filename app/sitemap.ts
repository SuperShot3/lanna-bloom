// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/orders';
import { getCatalogBouquetSitemapEntries } from '@/lib/catalogReads';
import { locales } from '@/lib/i18n';
import { articles } from '@/app/[lang]/info/_data/articles';
import type { ArticleMeta } from '@/app/[lang]/info/_data/articles';
import { getCollectionLandingPages } from '@/lib/landingPages/collectionLandingPages';
import { MARKETS } from '@/lib/delivery/markets';

type SitemapChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

type LocalePage = {
  path: string;
  changeFrequency: SitemapChangeFrequency;
  priority: number;
};

const LOCALE_PAGES: LocalePage[] = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/catalog', changeFrequency: 'daily', priority: 0.9 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/reviews', changeFrequency: 'weekly', priority: 0.55 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/refund-replacement', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/partner/apply', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/custom-order', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/info', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/flower-delivery-thailand', changeFrequency: 'monthly', priority: 0.72 },
];

function articleSitemapPath(article: ArticleMeta): string {
  if (article.externalPath !== undefined) {
    const suffix = article.externalPath.replace(/\/$/, '');
    return suffix || '';
  }
  return `/info/${article.slug}`;
}

function pushEntry(
  entries: Map<string, MetadataRoute.Sitemap[number]>,
  url: string,
  entry: Omit<MetadataRoute.Sitemap[number], 'url'>
) {
  entries.set(url, { url, ...entry });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  pushEntry(entries, base, { changeFrequency: 'daily', priority: 1 });

  for (const lang of locales) {
    for (const page of LOCALE_PAGES) {
      pushEntry(entries, `${base}/${lang}${page.path}`, {
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    }

    for (const market of MARKETS) {
      pushEntry(entries, `${base}/${lang}/${market.pathSlug}/flower-delivery`, {
        changeFrequency: 'weekly',
        priority: 0.68,
      });
    }

    for (const page of getCollectionLandingPages()) {
      pushEntry(entries, `${base}/${lang}${page.path}`, {
        changeFrequency: 'weekly',
        priority: 0.75,
      });
    }

    for (const article of articles) {
      if (article.excludeFromSitemap) continue;
      pushEntry(entries, `${base}/${lang}${articleSitemapPath(article)}`, {
        changeFrequency: 'monthly',
        priority: article.externalPath ? 0.62 : 0.6,
        lastModified: article.publishedAt,
      });
    }
  }

  try {
    const bouquets = await getCatalogBouquetSitemapEntries();
    for (const lang of locales) {
      for (const bouquet of bouquets) {
        pushEntry(entries, `${base}/${lang}/catalog/${bouquet.slug}`, {
          changeFrequency: 'weekly',
          priority: 0.8,
          lastModified: bouquet.updatedAt,
        });
      }
    }
  } catch {
    // Catalog unavailable — static and article URLs still ship.
  }

  return Array.from(entries.values());
}
