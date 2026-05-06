'use client';

import { useEffect } from 'react';
import { writeMarketSession } from '@/lib/delivery/marketSession';
import type { DeliveryMarketContextValue } from '@/contexts/DeliveryMarketContext';

/**
 * Writes sessionStorage whenever market layout context is active (cart/checkout read this).
 */
export function DeliveryMarketSessionBridge({ market }: { market: DeliveryMarketContextValue }) {
  useEffect(() => {
    writeMarketSession({
      destinationId: market.destinationId,
      pathSlug: market.pathSlug,
    });
  }, [market.destinationId, market.pathSlug]);

  return null;
}
