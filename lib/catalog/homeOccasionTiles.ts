import type { Bouquet } from '@/lib/bouquets';
import { firstStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { HOME_FLOWER_TYPE_TILE_ROTATE_MS } from '@/lib/catalog/homeFlowerTypeTiles';

/** Curated homepage tile order — keep to ~8, same as flower type. */
export const HOME_OCCASION_TILE_ORDER = [
  'birthday',
  'anniversary',
  'wedding',
  'romantic',
  'apology',
  'get_well',
  'congrats',
  'sympathy',
] as const;

export type HomeOccasionTile = {
  occasion: string;
  imageUrl: string;
};

function tileImageUrl(bouquet: Bouquet): string | null {
  const url = firstStorefrontRenderableImageUrl(bouquet.images);
  if (!url || url.startsWith('data:')) return null;
  return url;
}

/**
 * Pick one storefront-safe photo per curated occasion.
 * Rotate the bouquet using the homepage 60s window so ISR refreshes can change the tile.
 * Occasions with no tagged bouquet (or no renderable photo) are omitted.
 */
export function pickHomeOccasionTiles(
  bouquets: Bouquet[],
  nowMs: number
): HomeOccasionTile[] {
  return HOME_OCCASION_TILE_ORDER.flatMap((occasion) => {
    const candidates = bouquets
      .filter((bouquet) => bouquet.occasion?.includes(occasion))
      .map((bouquet) => {
        const imageUrl = tileImageUrl(bouquet);
        return imageUrl ? { id: bouquet.id, imageUrl } : null;
      })
      .filter((candidate): candidate is { id: string; imageUrl: string } => candidate != null)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (candidates.length === 0) return [];

    const index = Math.floor(nowMs / HOME_FLOWER_TYPE_TILE_ROTATE_MS) % candidates.length;
    return [{ occasion, imageUrl: candidates[index].imageUrl }];
  });
}
