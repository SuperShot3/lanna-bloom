'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isMarketPathSlug } from '@/lib/delivery/markets';
import { clearMarketSession } from '@/lib/delivery/marketSession';

/**
 * Clears expansion market session on Chiang Mai site routes so catalog/home imply CM delivery.
 * Keeps session on `/[lang]/cart` and `/[lang]/checkout/*` so regional funnels can still checkout.
 */
export function DeliveryDestinationSessionSync({ lang }: { lang: string }) {
  const pathname = usePathname() ?? '';

  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);
    const first = parts[0];
    if (first !== lang) return;

    const second = parts[1];
    const third = parts[2];
    const isCheckoutFlow =
      second === 'cart' || second === 'checkout' || second === 'track-order';
    if (isCheckoutFlow) return;

    // Keep market session on market catalog routes: /{lang}/catalog/{market}
    if (second === 'catalog' && third && isMarketPathSlug(third)) return;

    if (second && isMarketPathSlug(second)) return;

    clearMarketSession();
  }, [pathname, lang]);

  return null;
}
