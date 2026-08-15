/**
 * Pure unit tests for homepage occasion tile picking.
 * Run: npx tsx lib/catalog/homeOccasionTiles.test.ts
 */
import assert from 'node:assert/strict';
import {
  HOME_OCCASION_TILE_IMAGES,
  HOME_OCCASION_TILE_ORDER,
  pickHomeOccasionTiles,
} from '@/lib/catalog/homeOccasionTiles';

const tiles = pickHomeOccasionTiles();

assert.deepEqual(
  tiles.map((tile) => tile.occasion),
  [...HOME_OCCASION_TILE_ORDER]
);

for (const tile of tiles) {
  assert.equal(tile.imageUrl, HOME_OCCASION_TILE_IMAGES[tile.occasion]);
}

assert.equal(tiles[0].imageUrl, '/occasions/birthday.webp');
assert.equal(
  tiles.find((tile) => tile.occasion === 'congrats')?.imageUrl,
  '/occasions/congratulations.webp'
);

console.log('homeOccasionTiles.test.ts: ok');
