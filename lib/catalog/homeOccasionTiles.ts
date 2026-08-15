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

export type HomeOccasionValue = (typeof HOME_OCCASION_TILE_ORDER)[number];

export type HomeOccasionTile = {
  occasion: HomeOccasionValue;
  imageUrl: string;
};

/**
 * Dedicated occasion graphics in `content/images/occasions/` (served from `/occasions/`).
 * Catalog value `congrats` maps to `congratulations.webp`.
 */
export const HOME_OCCASION_TILE_IMAGES: Record<HomeOccasionValue, string> = {
  birthday: '/occasions/birthday.webp',
  anniversary: '/occasions/anniversary.webp',
  wedding: '/occasions/wedding.webp',
  romantic: '/occasions/romantic.webp',
  apology: '/occasions/apology.webp',
  get_well: '/occasions/get_well.webp',
  congrats: '/occasions/congratulations.webp',
  sympathy: '/occasions/sympathy.webp',
};

/** Static occasion tiles — one dedicated graphic per curated category. */
export function pickHomeOccasionTiles(): HomeOccasionTile[] {
  return HOME_OCCASION_TILE_ORDER.map((occasion) => ({
    occasion,
    imageUrl: HOME_OCCASION_TILE_IMAGES[occasion],
  }));
}
