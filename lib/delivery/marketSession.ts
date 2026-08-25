/**
 * Client-only session persistence so /cart knows the active expansion market
 * after navigating away from market layouts.
 */

import {
  getMarketByDestinationId,
  marketIsNavSelectable,
  type DeliveryDestinationId,
  type MarketPathSlug,
} from '@/lib/delivery/markets';

export const MARKET_SESSION_STORAGE_KEY = 'lanna-bloom-delivery-market';

/** Dispatched after write/clear so cart can refresh without navigation. */
export const MARKET_SESSION_CHANGE_EVENT = 'lanna-bloom-market-session-change';

export interface MarketSessionPayload {
  destinationId: DeliveryDestinationId;
  pathSlug: MarketPathSlug;
}

function notifyMarketSessionChange(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(MARKET_SESSION_CHANGE_EVENT));
  } catch {
    // ignore
  }
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
    notifyMarketSessionChange();
  } catch {
    // ignore
  }
}

export function clearMarketSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(MARKET_SESSION_STORAGE_KEY);
    notifyMarketSessionChange();
  } catch {
    // ignore
  }
}

/** Apply a shared/recovered destination so cart dropdowns match the snapshot city. */
export function applyDestinationToMarketSession(destinationId: DeliveryDestinationId): void {
  if (destinationId === 'CHIANG_MAI') {
    clearMarketSession();
    return;
  }
  const market = getMarketByDestinationId(destinationId);
  if (!market || !marketIsNavSelectable(market)) {
    clearMarketSession();
    return;
  }
  writeMarketSession({
    destinationId: market.destinationId,
    pathSlug: market.pathSlug,
  });
}
