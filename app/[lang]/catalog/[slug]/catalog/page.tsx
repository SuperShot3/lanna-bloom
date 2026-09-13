import { permanentRedirect } from 'next/navigation';
import { getMarketByPathSlug, marketIsRouteAvailable } from '@/lib/delivery/markets';
import { isValidLocale } from '@/lib/i18n';

/**
 * Fallback 308 if middleware did not run. City listings collapse onto /catalog.
 * Cookie is set in middleware.
 */
export default function MarketCatalogPageViaSlug({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  if (!isValidLocale(params.lang)) {
    permanentRedirect('/en/catalog');
  }
  const market = getMarketByPathSlug(params.slug);
  if (market && marketIsRouteAvailable(market)) {
    permanentRedirect(`/${params.lang}/catalog`);
  }
  permanentRedirect(`/${params.lang}/catalog`);
}
