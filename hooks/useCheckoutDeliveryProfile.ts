'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDeliveryMarketOptional } from '@/contexts/DeliveryMarketContext';
import {
  getMarketByDestinationId,
  getMarketByPathSlug,
  isMarketPathSlug,
  isExpansionDestination,
  destinationDisplayName,
  type DeliveryDestinationId,
  type MarketPathSlug,
} from '@/lib/delivery/markets';
import {
  MARKET_SESSION_CHANGE_EVENT,
  MARKET_SESSION_STORAGE_KEY,
  readMarketSession,
} from '@/lib/delivery/marketSession';
import { readDeliveryRegionCookieClient } from '@/lib/delivery/deliveryRegionCookie';
import type { Locale } from '@/lib/i18n';

export type CheckoutDeliveryProfile = {
  destinationId: DeliveryDestinationId;
  variant: 'chiang-mai' | 'expansion';
  /** Expansion market URL slug; null for Chiang Mai hub. */
  pathSlug: MarketPathSlug | null;
  labels: { en: string; th: string };
};

/**
 * Resolves checkout destination: nested market layout → URL slug → cookie → sessionStorage → Chiang Mai.
 */
export function useCheckoutDeliveryProfile(_lang: Locale): CheckoutDeliveryProfile {
  const pathname = usePathname() ?? '';
  const marketCtx = useDeliveryMarketOptional();
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    const bump = () => setSessionVersion((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MARKET_SESSION_STORAGE_KEY || e.key === null) bump();
    };
    window.addEventListener(MARKET_SESSION_CHANGE_EVENT, bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(MARKET_SESSION_CHANGE_EVENT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return useMemo(() => {
    if (marketCtx) {
      return {
        destinationId: marketCtx.destinationId,
        variant: 'expansion' as const,
        pathSlug: marketCtx.pathSlug,
        labels: { en: marketCtx.labelEn, th: marketCtx.labelTh },
      };
    }

    const parts = pathname.split('/').filter(Boolean);
    // Pattern A: /{lang}/{market}/...
    const slugDirect = parts[1];
    if (slugDirect && isMarketPathSlug(slugDirect)) {
      const m = getMarketByPathSlug(slugDirect);
      if (m) {
        return {
          destinationId: m.destinationId,
          variant: 'expansion' as const,
          pathSlug: m.pathSlug,
          labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
        };
      }
    }

    // Pattern B1: /{lang}/catalog/{market}/... (market listing, not a product slug)
    const maybeCatalog = parts[1];
    const slugUnderCatalog = parts[2];
    if (
      maybeCatalog === 'catalog' &&
      slugUnderCatalog &&
      isMarketPathSlug(slugUnderCatalog) &&
      (!parts[3] || parts[3] === 'catalog')
    ) {
      const m = getMarketByPathSlug(slugUnderCatalog);
      if (m) {
        return {
          destinationId: m.destinationId,
          variant: 'expansion' as const,
          pathSlug: m.pathSlug,
          labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
        };
      }
    }

    if (typeof window !== 'undefined') {
      const cookieDest = readDeliveryRegionCookieClient();
      if (cookieDest === 'CHIANG_MAI') {
        return chiangMaiProfile();
      }
      if (cookieDest && isExpansionDestination(cookieDest)) {
        const m = getMarketByDestinationId(cookieDest);
        if (m) {
          return {
            destinationId: m.destinationId,
            variant: 'expansion' as const,
            pathSlug: m.pathSlug,
            labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
          };
        }
      }

      const sess = readMarketSession();
      if (sess && isExpansionDestination(sess.destinationId)) {
        const m = getMarketByPathSlug(sess.pathSlug);
        if (m) {
          return {
            destinationId: sess.destinationId,
            variant: 'expansion' as const,
            pathSlug: m.pathSlug,
            labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
          };
        }
      }
    }

    return chiangMaiProfile();
  }, [marketCtx, pathname, sessionVersion]);
}

function chiangMaiProfile(): CheckoutDeliveryProfile {
  return {
    destinationId: 'CHIANG_MAI',
    variant: 'chiang-mai',
    pathSlug: null,
    labels: {
      en: destinationDisplayName('CHIANG_MAI', 'en'),
      th: destinationDisplayName('CHIANG_MAI', 'th'),
    },
  };
}
