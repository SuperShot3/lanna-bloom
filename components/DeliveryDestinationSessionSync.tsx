'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { shouldPreserveDeliveryRegionOnPath } from '@/lib/delivery/regionalProductRedirect';
import { clearMarketSession } from '@/lib/delivery/marketSession';

/**
 * Clears expansion market session on the Chiang Mai homepage so that hub
 * does not keep a stale sessionStorage market.
 * Keeps region on catalog listings, product PDPs, cart/checkout, and market landings.
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
