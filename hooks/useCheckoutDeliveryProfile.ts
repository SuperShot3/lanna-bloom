'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useDeliveryMarketOptional } from '@/contexts/DeliveryMarketContext';
import {
  getMarketByPathSlug,
  isMarketPathSlug,
  isExpansionDestination,
  destinationDisplayName,
  type DeliveryDestinationId,
} from '@/lib/delivery/markets';
import { readMarketSession } from '@/lib/delivery/marketSession';
import type { Locale } from '@/lib/i18n';

export type CheckoutDeliveryProfile = {
  destinationId: DeliveryDestinationId;
  variant: 'chiang-mai' | 'expansion';
  labels: { en: string; th: string };
};

/**
 * Resolves checkout destination: nested market layout → URL slug → sessionStorage → Chiang Mai.
 */
export function useCheckoutDeliveryProfile(_lang: Locale): CheckoutDeliveryProfile {
  const pathname = usePathname() ?? '';
  const marketCtx = useDeliveryMarketOptional();

  return useMemo(() => {
    if (marketCtx) {
      return {
        destinationId: marketCtx.destinationId,
        variant: 'expansion',
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
          variant: 'expansion',
          labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
        };
      }
    }

    // Pattern B1: /{lang}/catalog/{market}/...
    const maybeCatalog = parts[1];
    const slugUnderCatalog = parts[2];
    if (maybeCatalog === 'catalog' && slugUnderCatalog && isMarketPathSlug(slugUnderCatalog)) {
      const m = getMarketByPathSlug(slugUnderCatalog);
      if (m) {
        return {
          destinationId: m.destinationId,
          variant: 'expansion',
          labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
        };
      }
    }

    if (typeof window !== 'undefined') {
      const sess = readMarketSession();
      if (sess && isExpansionDestination(sess.destinationId)) {
        const m = getMarketByPathSlug(sess.pathSlug);
        if (m) {
          return {
            destinationId: sess.destinationId,
            variant: 'expansion',
            labels: { en: m.customerFacingNameEn, th: m.customerFacingNameTh },
          };
        }
      }
    }

    return {
      destinationId: 'CHIANG_MAI',
      variant: 'chiang-mai',
      labels: {
        en: destinationDisplayName('CHIANG_MAI', 'en'),
        th: destinationDisplayName('CHIANG_MAI', 'th'),
      },
    };
  }, [marketCtx, pathname]);
}
