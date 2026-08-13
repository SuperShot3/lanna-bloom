/**
 * Pure unit tests for homepage flower-type tile picking.
 * Run: npx tsx lib/catalog/homeFlowerTypeTiles.test.ts
 */
import assert from 'node:assert/strict';
import type { Bouquet } from '@/lib/bouquets';
import {
  HOME_FLOWER_TYPE_TILE_ROTATE_MS,
  pickHomeFlowerTypeTiles,
} from '@/lib/catalog/homeFlowerTypeTiles';

const PHOTO_A = 'https://xxx.supabase.co/storage/v1/object/public/catalog/rose-a.webp';
const PHOTO_B = 'https://xxx.supabase.co/storage/v1/object/public/catalog/rose-b.webp';
const PHOTO_ORCHID = 'https://xxx.supabase.co/storage/v1/object/public/catalog/orchid.webp';
const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';

function bouquet(partial: Partial<Bouquet> & Pick<Bouquet, 'id' | 'flowerTypes' | 'images'>): Bouquet {
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
    pricingType: 'single_price',
    ...partial,
  } as Bouquet;
}

const tiles = pickHomeFlowerTypeTiles(
  [
    bouquet({ id: 'rose-b', flowerTypes: ['rose'], images: [PHOTO_B] }),
    bouquet({ id: 'rose-a', flowerTypes: ['rose'], images: [PHOTO_A] }),
    bouquet({ id: 'orchid-1', flowerTypes: ['orchid'], images: [PHOTO_ORCHID] }),
    bouquet({ id: 'lotus-empty', flowerTypes: ['lotus'], images: [PLACEHOLDER] }),
    bouquet({ id: 'tulip-1', flowerTypes: ['tulip'], images: [PHOTO_A] }),
  ],
  0
);

assert.deepEqual(
  tiles.map((tile) => tile.type),
  ['rose', 'orchid']
);
assert.equal(tiles[0].imageUrl, PHOTO_A);
assert.equal(tiles[1].imageUrl, PHOTO_ORCHID);

const later = pickHomeFlowerTypeTiles(
  [
    bouquet({ id: 'rose-b', flowerTypes: ['rose'], images: [PHOTO_B] }),
    bouquet({ id: 'rose-a', flowerTypes: ['rose'], images: [PHOTO_A] }),
  ],
  HOME_FLOWER_TYPE_TILE_ROTATE_MS
);
assert.equal(later[0].imageUrl, PHOTO_B);

console.log('homeFlowerTypeTiles.test.ts: ok');
