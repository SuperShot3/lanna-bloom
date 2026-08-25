/**
 * Catalog card hover playlist — unique URLs, start from current size photo.
 * Run: npx tsx lib/catalog/catalogCardHoverGallery.test.ts
 */
import assert from 'node:assert/strict';
import {
  altForCatalogCardHoverImage,
  buildCatalogCardHoverPlaylist,
  catalogCardHoverStartIndex,
} from './catalogCardHoverGallery';

const IMG_A = 'https://xxx.supabase.co/storage/v1/object/public/catalog/a.webp';
const IMG_B = 'https://xxx.supabase.co/storage/v1/object/public/catalog/b.webp';
const IMG_C = 'https://xxx.supabase.co/storage/v1/object/public/catalog/c.webp';
const IMG_SIZE = 'https://xxx.supabase.co/storage/v1/object/public/catalog/size.webp';

const gallery = buildCatalogCardHoverPlaylist({
  gallery: [IMG_A, ' ', IMG_B, IMG_A, IMG_C],
  currentSrc: IMG_A,
});
assert.deepEqual(gallery, [IMG_A, IMG_B, IMG_C]);
assert.equal(catalogCardHoverStartIndex(gallery, IMG_A), 0);
assert.equal(catalogCardHoverStartIndex(gallery, IMG_B), 1);

const fromLaterSlide = buildCatalogCardHoverPlaylist({
  gallery: [IMG_A, IMG_B, IMG_C],
  currentSrc: IMG_C,
});
assert.deepEqual(fromLaterSlide, [IMG_A, IMG_B, IMG_C]);
assert.equal(catalogCardHoverStartIndex(fromLaterSlide, IMG_C), 2);

const sizeNotInGallery = buildCatalogCardHoverPlaylist({
  gallery: [IMG_A, IMG_B],
  currentSrc: IMG_SIZE,
});
assert.deepEqual(sizeNotInGallery, [IMG_SIZE, IMG_A, IMG_B]);
assert.equal(catalogCardHoverStartIndex(sizeNotInGallery, IMG_SIZE), 0);

const emptyGallery = buildCatalogCardHoverPlaylist({
  gallery: [],
  currentSrc: IMG_SIZE,
});
assert.deepEqual(emptyGallery, [IMG_SIZE]);

const noCurrent = buildCatalogCardHoverPlaylist({
  gallery: [IMG_A, IMG_B],
  currentSrc: '',
});
assert.deepEqual(noCurrent, [IMG_A, IMG_B]);
assert.equal(catalogCardHoverStartIndex(noCurrent, 'missing'), 0);

assert.equal(
  altForCatalogCardHoverImage([IMG_A, IMG_B], ['Rose front', 'Rose side'], IMG_B, 'Rose'),
  'Rose side'
);
assert.equal(
  altForCatalogCardHoverImage([IMG_A, IMG_B], ['Rose front'], IMG_SIZE, 'Rose'),
  'Rose front'
);

console.log('catalogCardHoverGallery.test.ts: all passed');
