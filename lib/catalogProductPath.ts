import { isMarketPathSlug } from '@/lib/delivery/markets';

/**
 * True for public catalog product detail URLs (bouquet, gift, balloon, etc.),
 * not the main `/catalog` listing or `/catalog/{market}` hub pages.
 */
export function isCatalogProductDetailPath(basePath: string): boolean {
  const match = basePath.match(/^\/catalog\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match) return false;
  const firstSegment = match[1];
  const nestedSegment = match[2];
  if (isMarketPathSlug(firstSegment)) {
    return Boolean(nestedSegment);
  }
  return true;
}
