import {
  buildGoogleMerchantFeed,
  logFeedSkippedProducts,
} from '@/lib/feeds/googleMerchantFeed';
import {
  getBalloonsFilteredFromSanity,
  getBouquetsFromSanity,
  getPlushyToysFilteredFromSanity,
} from '@/lib/sanity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [bouquets, toys, balloons] = await Promise.all([
      getBouquetsFromSanity(),
      getPlushyToysFilteredFromSanity({ sort: 'newest' }),
      getBalloonsFilteredFromSanity({ sort: 'newest' }),
    ]);

    const { tsv, rowCount, skipped } = buildGoogleMerchantFeed({
      bouquets,
      plushyToys: toys,
      balloons,
    });

    logFeedSkippedProducts(skipped);

    return new Response(tsv, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Feed-Rows': String(rowCount),
        'X-Feed-Skipped': String(skipped.length),
      },
    });
  } catch (err) {
    console.error('[Feed] google-merchant-feed generation failed:', err);
    return new Response('Feed generation failed', { status: 500 });
  }
}
