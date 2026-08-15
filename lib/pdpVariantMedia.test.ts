/**
 * Size ↔ gallery mapping for catalog cards (fewer photos than variants).
 * Run: npx tsx lib/pdpVariantMedia.test.ts
 */
import assert from 'node:assert/strict';
import {
  catalogCardImageForSize,
  galleryIndexForSize,
  sizeIndexForGalleryIndex,
} from '@/lib/pdpVariantMedia';

const IMG_A = 'https://xxx.supabase.co/storage/v1/object/public/catalog/a.webp';
const IMG_B = 'https://xxx.supabase.co/storage/v1/object/public/catalog/b.webp';
const IMG_SIZE = 'https://xxx.supabase.co/storage/v1/object/public/catalog/size.webp';

const images = [IMG_A, IMG_B];
const sizeCount = 4;
const imageCount = 2;

// 4 sizes / 2 photos: biggest (index 3) → last photo
assert.equal(galleryIndexForSize(3, imageCount), 1);
assert.equal(catalogCardImageForSize({ images, sizeIndex: 3 }).url, IMG_B);
assert.equal(catalogCardImageForSize({ images, sizeIndex: 0 }).url, IMG_A);

// Swipe to first photo → first size
assert.equal(sizeIndexForGalleryIndex(0, sizeCount, imageCount, 3), 0);

// Swipe back to last photo while biggest is selected → keep biggest
assert.equal(sizeIndexForGalleryIndex(1, sizeCount, imageCount, 3), 3);

// Last photo with no current size (or a size that does not map there) → clamp to size 1
assert.equal(sizeIndexForGalleryIndex(1, sizeCount, imageCount, 0), 1);
assert.equal(sizeIndexForGalleryIndex(1, sizeCount, imageCount, null), 1);

// Per-size photo wins for cart/display URL; gallery index still maps the shared stack
const sized = catalogCardImageForSize({
  images,
  sizeIndex: 3,
  sizeImageUrls: [IMG_SIZE],
});
assert.equal(sized.url, IMG_SIZE);
assert.equal(sized.galleryIndex, 1);

console.log('pdpVariantMedia.test.ts: all passed');
