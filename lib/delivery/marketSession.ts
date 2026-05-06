/**
 * Client-only session persistence so /cart knows the active expansion market
 * after navigating away from market layouts.
 */

import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import type { MarketPathSlug } from '@/lib/delivery/markets';

export const MARKET_SESSION_STORAGE_KEY = 'lanna-bloom-delivery-market';

export interface MarketSessionPayload {
  destinationId: DeliveryDestinationId;
  pathSlug: MarketPathSlug;
}

export function readMarketSession(): MarketSessionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MARKET_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MarketSessionPayload>;
    if (
      parsed &&
      typeof parsed.destinationId === 'string' &&
      typeof parsed.pathSlug === 'string'
    ) {
      return {
        destinationId: parsed.destinationId as DeliveryDestinationId,
        pathSlug: parsed.pathSlug as MarketPathSlug,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function writeMarketSession(payload: MarketSessionPayload): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MARKET_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearMarketSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(MARKET_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
