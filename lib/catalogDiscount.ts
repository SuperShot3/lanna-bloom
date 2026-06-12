import type { DeliveryDestinationId } from '@/lib/delivery/markets';
import { applyExpansionItemMarkupThb } from '@/lib/expansionMarkup';

/** Parse CMS discount; returns undefined when inactive. */
export function normalizeCatalogDiscountPercent(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  const n = Math.round(raw);
  if (n < 1 || n > 90) return undefined;
  return n;
}

export function hasCatalogDiscount(discountPercent?: number): boolean {
  return normalizeCatalogDiscountPercent(discountPercent) != null;
}

/** Round down to whole THB (storefront + checkout). */
export function applyCatalogDiscountThb(priceThb: number, discountPercent?: number): number {
  const pct = normalizeCatalogDiscountPercent(discountPercent);
  if (!pct || priceThb <= 0) return Math.max(0, Math.round(priceThb));
  return Math.max(0, Math.floor((priceThb * (100 - pct)) / 100));
}

export function effectiveCatalogUnitPriceThb(
  basePriceThb: number,
  discountPercent?: number
): number {
  return applyCatalogDiscountThb(basePriceThb, discountPercent);
}

export function effectiveCatalogUnitPriceWithExpansion(
  basePriceThb: number,
  discountPercent: number | undefined,
  destinationId: DeliveryDestinationId
): number {
  return applyExpansionItemMarkupThb(
    applyCatalogDiscountThb(basePriceThb, discountPercent),
    destinationId
  );
}

export function minDiscountedPriceFromOptions(
  prices: number[],
  discountPercent?: number
): number {
  if (!prices.length) return 0;
  return Math.min(...prices.map((p) => applyCatalogDiscountThb(p, discountPercent)));
}
