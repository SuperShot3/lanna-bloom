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

export const DEFAULT_DELIVERY_DESTINATION_ID: DeliveryDestinationId = 'CHIANG_MAI';

export function catalogHrefForDestination(
  lang: string,
  destinationId: DeliveryDestinationId
): string {
  if (destinationId === DEFAULT_DELIVERY_DESTINATION_ID) {
    return `/${lang}/catalog`;
  }
  const market = getNavMarkets().find((m) => m.destinationId === destinationId);
  if (!market) return `/${lang}/catalog`;
  return `/${lang}/catalog/${market.pathSlug}/catalog`;
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
      options.router.push(
        catalogHrefForDestination(options.lang, DEFAULT_DELIVERY_DESTINATION_ID)
      );
    }
    return { pathSlug: null };
  }

  applyDestinationToMarketSession(market.destinationId);
  if (options.navigate !== false) {
    options.router.push(catalogHrefForDestination(options.lang, market.destinationId));
  }
  return { pathSlug: market.pathSlug };
}
