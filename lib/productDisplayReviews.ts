import { mulberry32 } from '@/lib/catalogListLogic';

function seedFromProductId(productId: string): number {
  let h = 0;
  for (let i = 0; i < productId.length; i++) {
    h = Math.imul(31, h) + productId.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Decorative per-bouquet review stats for storefront PDPs.
 * Stable per product id — not tied to real per-product reviews.
 */
export function getBouquetDisplayReviewStats(productId: string): {
  average: number;
  count: number;
} {
  const rng = mulberry32(seedFromProductId(productId));
  const count = Math.floor(rng() * 91) + 10;
  const average = Math.round((4.5 + rng() * 0.5) * 10) / 10;
  return { average, count };
}
