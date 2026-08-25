/**
 * Catalog H1 for a single flower-type filter.
 * Run: npx tsx lib/catalog/flowerTypeTitle.test.ts
 */
import assert from 'node:assert/strict';
import { flowerTypeCatalogTitle } from './flowerTypeTitle';

assert.equal(flowerTypeCatalogTitle('rose', 'en'), 'Rose Bouquets');
assert.equal(flowerTypeCatalogTitle('orchid', 'en'), 'Orchid Bouquets');
assert.ok(flowerTypeCatalogTitle('lily', 'th').includes('ลิลลี่'));

console.log('catalog/flowerTypeTitle.test.ts: ok');
