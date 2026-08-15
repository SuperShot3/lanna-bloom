/**
 * Pure unit tests for homepage occasion tile picking.
 * Run: npx tsx lib/catalog/homeOccasionTiles.test.ts
 */
import assert from 'node:assert/strict';
import type { Bouquet } from '@/lib/bouquets';
import { HOME_FLOWER_TYPE_TILE_ROTATE_MS } from '@/lib/catalog/homeFlowerTypeTiles';
import { pickHomeOccasionTiles } from '@/lib/catalog/homeOccasionTiles';

const PHOTO_A = 'https://xxx.supabase.co/storage/v1/object/public/catalog/birthday-a.webp';
const PHOTO_B = 'https://xxx.supabase.co/storage/v1/object/public/catalog/birthday-b.webp';
const PHOTO_ROMANTIC = 'https://xxx.supabase.co/storage/v1/object/public/catalog/romantic.webp';
const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';

function bouquet(
  partial: Partial<Bouquet> & Pick<Bouquet, 'id' | 'occasion' | 'images'>
): Bouquet {
  return {
    slug: partial.id,
    nameEn: partial.id,
    nameTh: partial.id,
    descriptionEn: '',
    descriptionTh: '',
    imageAlts: [],
    sizes: [],
    status: 'live',
    featuredPopular: false,
    colors: [],
    flowerTypes: [],
    pricingType: 'single_price',
    ...partial,
  } as Bouquet;
}

const tiles = pickHomeOccasionTiles(
  [
    bouquet({ id: 'bday-b', occasion: ['birthday'], images: [PHOTO_B] }),
    bouquet({ id: 'bday-a', occasion: ['birthday'], images: [PHOTO_A] }),
    bouquet({ id: 'rom-1', occasion: ['romantic'], images: [PHOTO_ROMANTIC] }),
    bouquet({ id: 'wedding-empty', occasion: ['wedding'], images: [PLACEHOLDER] }),
    bouquet({ id: 'untagged', occasion: [], images: [PHOTO_A] }),
  ],
  0
);

assert.deepEqual(
  tiles.map((tile) => tile.occasion),
  ['birthday', 'romantic']
);
assert.equal(tiles[0].imageUrl, PHOTO_A);
assert.equal(tiles[1].imageUrl, PHOTO_ROMANTIC);

const later = pickHomeOccasionTiles(
  [
    bouquet({ id: 'bday-b', occasion: ['birthday'], images: [PHOTO_B] }),
    bouquet({ id: 'bday-a', occasion: ['birthday'], images: [PHOTO_A] }),
  ],
  HOME_FLOWER_TYPE_TILE_ROTATE_MS
);
assert.equal(later[0].imageUrl, PHOTO_B);

const noPhotoOmitted = pickHomeOccasionTiles(
  [
    bouquet({ id: 'bday-a', occasion: ['birthday'], images: [PHOTO_A] }),
    bouquet({ id: 'apology-empty', occasion: ['apology'], images: [PLACEHOLDER] }),
  ],
  0
);
assert.deepEqual(
  noPhotoOmitted.map((tile) => tile.occasion),
  ['birthday'],
  'occasions with no storefront-safe photo (or none tagged) are omitted'
);

console.log('homeOccasionTiles.test.ts: ok');
