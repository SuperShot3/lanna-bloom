'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { MarketPathSlug } from '@/lib/delivery/markets';

export interface DeliveryMarketContextValue {
  destinationId: DeliveryDestinationId;
  pathSlug: MarketPathSlug;
  labelEn: string;
  labelTh: string;
}

const DeliveryMarketContext = createContext<DeliveryMarketContextValue | null>(null);

export function DeliveryMarketProvider({
  children,
  destinationId,
  pathSlug,
  labelEn,
  labelTh,
}: {
  children: ReactNode;
  destinationId: DeliveryDestinationId;
  pathSlug: MarketPathSlug;
  labelEn: string;
  labelTh: string;
}) {
  const value = useMemo(
    () => ({ destinationId, pathSlug, labelEn, labelTh }),
    [destinationId, pathSlug, labelEn, labelTh]
  );
  return (
    <DeliveryMarketContext.Provider value={value}>{children}</DeliveryMarketContext.Provider>
  );
}

export function useDeliveryMarketOptional(): DeliveryMarketContextValue | null {
  return useContext(DeliveryMarketContext);
}

export function useDeliveryMarket(): DeliveryMarketContextValue {
  const v = useContext(DeliveryMarketContext);
  if (!v) {
    throw new Error('useDeliveryMarket must be used within DeliveryMarketProvider');
  }
  return v;
}
