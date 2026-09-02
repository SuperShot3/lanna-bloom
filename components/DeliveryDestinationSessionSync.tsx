'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { shouldPreserveDeliveryRegionOnPath } from '@/lib/delivery/regionalProductRedirect';
import { clearMarketSession } from '@/lib/delivery/marketSession';

/**
 * Clears expansion market session on Chiang Mai hub routes (home, /catalog listing)
 * so those pages do not keep a stale sessionStorage market.
 * Keeps region on product PDPs, cart/checkout, market landings, and market catalogs.
 * Does not clear the persistent delivery-region cookie.
 */
export function DeliveryDestinationSessionSync({ lang }: { lang: string }) {
  const pathname = usePathname() ?? '';

  useEffect(() => {
    if (shouldPreserveDeliveryRegionOnPath(pathname, lang)) return;
    clearMarketSession();
  }, [pathname, lang]);

  return null;
}
