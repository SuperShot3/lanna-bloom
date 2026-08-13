import type { Bouquet } from '@/lib/bouquets';
import { firstStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { STOREFRONT_FLOWER_TYPES } from '@/lib/catalogCategories';

/** Curated homepage tile order — not the full storefront facet list. */
export const HOME_FLOWER_TYPE_TILE_ORDER = [
  'rose',
  'orchid',
  'lily',
  'sunflower',
  'mixed',
  'lotus',
  'carnation',
  'hydrangea',
] as const;

/** Matches homepage ISR (`revalidate = 60`). */
export const HOME_FLOWER_TYPE_TILE_ROTATE_MS = 60_000;

export type HomeFlowerTypeTile = {
  type: string;
  imageUrl: string;
};

function tileImageUrl(bouquet: Bouquet): string | null {
  const url = firstStorefrontRenderableImageUrl(bouquet.images);
  if (!url || url.startsWith('data:')) return null;
  return url;
}

/**
 * Pick one storefront-safe photo per curated flower type.
 * Rotate the bouquet using the homepage 60s window so ISR refreshes can change the tile.
 */
export function pickHomeFlowerTypeTiles(
  bouquets: Bouquet[],
  nowMs: number
): HomeFlowerTypeTile[] {
  const allowedTypes = HOME_FLOWER_TYPE_TILE_ORDER.filter((type) =>
    (STOREFRONT_FLOWER_TYPES as readonly string[]).includes(type)
  );

  return allowedTypes.flatMap((type) => {
    const candidates = bouquets
      .filter((bouquet) => bouquet.flowerTypes?.includes(type))
      .map((bouquet) => {
        const imageUrl = tileImageUrl(bouquet);
        return imageUrl ? { id: bouquet.id, imageUrl } : null;
      })
      .filter((candidate): candidate is { id: string; imageUrl: string } => candidate != null)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (candidates.length === 0) return [];

    const index = Math.floor(nowMs / HOME_FLOWER_TYPE_TILE_ROTATE_MS) % candidates.length;
    return [{ type, imageUrl: candidates[index].imageUrl }];
  });
}
