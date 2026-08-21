/**
 * Run: npx tsx lib/catalog/imageAiGenerated.test.ts
 */
import assert from 'node:assert/strict';
import {
  catalogImageSourceTypeFromFlag,
  imageAiGeneratedFlags,
  isCatalogImageAiGenerated,
  isImageUrlAiGenerated,
  parseCatalogImageSourceType,
} from './imageAiGenerated';

assert.equal(isCatalogImageAiGenerated('ai_generated'), true);
assert.equal(isCatalogImageAiGenerated('uploaded'), false);
assert.equal(isCatalogImageAiGenerated('migrated_from_sanity'), false);
assert.equal(isCatalogImageAiGenerated(undefined), false);
assert.equal(isCatalogImageAiGenerated(null), false);

assert.equal(parseCatalogImageSourceType('ai_generated'), 'ai_generated');
assert.equal(parseCatalogImageSourceType('uploaded'), 'uploaded');
assert.equal(parseCatalogImageSourceType('migrated_from_sanity'), 'migrated_from_sanity');
assert.equal(parseCatalogImageSourceType('other'), undefined);
assert.equal(parseCatalogImageSourceType(null), undefined);

assert.equal(catalogImageSourceTypeFromFlag(true), 'ai_generated');
assert.equal(catalogImageSourceTypeFromFlag(false), 'uploaded');

assert.deepEqual(imageAiGeneratedFlags(['uploaded', 'ai_generated', 'migrated_from_sanity']), [
  false,
  true,
  false,
]);

assert.equal(
  isImageUrlAiGenerated('https://cdn.example/ai.webp', [
    { images: ['https://cdn.example/photo.webp', 'https://cdn.example/ai.webp'], imageAiGenerated: [false, true] },
  ]),
  true
);
assert.equal(
  isImageUrlAiGenerated('https://cdn.example/photo.webp', [
    { images: ['https://cdn.example/photo.webp', 'https://cdn.example/ai.webp'], imageAiGenerated: [false, true] },
  ]),
  false
);
assert.equal(
  isImageUrlAiGenerated('https://cdn.example/ai.webp', [
    { images: ['https://cdn.example/ai.webp'], imageAiGenerated: [true] },
    { images: ['https://cdn.example/ai.webp', 'https://cdn.example/photo.webp'], imageAiGenerated: [true, false] },
  ]),
  true
);
assert.equal(isImageUrlAiGenerated('https://cdn.example/missing.webp', [{ images: ['https://cdn.example/a.webp'], imageAiGenerated: [true] }]), false);
assert.equal(isImageUrlAiGenerated('https://cdn.example/a.webp', [{ images: ['https://cdn.example/a.webp'] }]), false);

console.log('imageAiGenerated tests passed');
