import {
  buildOpenAiProductFeed,
  logOpenAiFeedSkippedProducts,
} from '@/lib/feeds/openAiProductFeed';
import {
  getCatalogBouquets,
  getCatalogProductsFiltered,
} from '@/lib/catalogReads';
import { PRODUCT_CATEGORIES } from '@/lib/catalogCategories';

/** Cache feed generation — catalog data is already CDN-cached via lib/catalogReads. */
export const revalidate = 3600;

export async function GET() {
  try {
    const [bouquets, ...productGroups] = await Promise.all([
      getCatalogBouquets(),
      ...PRODUCT_CATEGORIES.map((categoryKey) =>
        getCatalogProductsFiltered({ categoryKey, sort: 'newest' })
      ),
    ]);

    const { csv, rowCount, skipped } = buildOpenAiProductFeed({
      bouquets,
      products: productGroups.flat(),
    });

    logOpenAiFeedSkippedProducts(skipped);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Disposition': 'inline; filename="openai-product-feed.csv"',
        'X-Feed-Rows': String(rowCount),
        'X-Feed-Skipped': String(skipped.length),
      },
    });
  } catch (err) {
    console.error('[Feed] openai-product-feed generation failed:', err);
    return new Response('Feed generation failed', { status: 500 });
  }
}
