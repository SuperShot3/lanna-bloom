import { permanentRedirect } from 'next/navigation';
import { getMarketByPathSlug, marketIsRouteAvailable } from '@/lib/delivery/markets';
import { isValidLocale } from '@/lib/i18n';

export const revalidate = 60;
export const dynamicParams = true;

/**
 * Fallback 308 if middleware did not run. Cookie is set in middleware;
 * this path only consolidates the URL.
 */
export default function MarketCatalogProductPage({
  params,
}: {
  params: { lang: string; slug: string; productSlug: string };
}) {
  if (!isValidLocale(params.lang)) {
    permanentRedirect('/en/catalog');
  }
  const market = getMarketByPathSlug(params.slug);
  if (market && marketIsRouteAvailable(market)) {
    permanentRedirect(`/${params.lang}/catalog/${params.productSlug}`);
  }
  permanentRedirect(`/${params.lang}/catalog/${params.productSlug}`);
}
