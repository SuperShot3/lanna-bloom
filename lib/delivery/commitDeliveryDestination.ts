/**
 * Shared destination commit + catalog href used by the header picker
 * and the first-visit delivery prompt. Keep URLs in one place.
 */

import {
  getNavMarkets,
  type DeliveryDestinationId,
  type MarketPathSlug,
} from '@/lib/delivery/markets';
import { applyDestinationToMarketSession } from '@/lib/delivery/marketSession';
import { buildMarketCatalogHref } from '@/lib/delivery/marketRoute';

export const DEFAULT_DELIVERY_DESTINATION_ID: DeliveryDestinationId = 'CHIANG_MAI';

export function catalogHrefForDestination(
  lang: string,
  _destinationId: DeliveryDestinationId
): string {
  return buildMarketCatalogHref(lang);
}

export function commitDeliveryDestination(
  destinationId: DeliveryDestinationId,
  options: {
    lang: string;
    navigate?: boolean;
    router: { push: (href: string) => void };
  }
): { pathSlug: MarketPathSlug | null } {
  const market =
    destinationId === DEFAULT_DELIVERY_DESTINATION_ID
      ? null
      : (getNavMarkets().find((m) => m.destinationId === destinationId) ?? null);

  if (!market) {
    applyDestinationToMarketSession(DEFAULT_DELIVERY_DESTINATION_ID);
    if (options.navigate !== false) {
      navigateToCatalog(options.lang, options.router);
    }
    return { pathSlug: null };
  }

  applyDestinationToMarketSession(market.destinationId);
  if (options.navigate !== false) {
    navigateToCatalog(options.lang, options.router);
  }
  return { pathSlug: market.pathSlug };
}

function navigateToCatalog(
  lang: string,
  router: { push: (href: string) => void }
): void {
  const href = catalogHrefForDestination(lang, DEFAULT_DELIVERY_DESTINATION_ID);
  if (typeof window !== 'undefined') {
    const current = window.location.pathname.replace(/\/$/, '') || '/';
    if (current === href.replace(/\/$/, '')) {
      window.location.reload();
      return;
    }
  }
  router.push(href);
}
