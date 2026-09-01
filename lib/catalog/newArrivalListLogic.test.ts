/**
 * New Arrival list/filter helpers.
 * Run: npx tsx lib/catalog/newArrivalListLogic.test.ts
 */
import assert from 'node:assert/strict';
import type { Bouquet } from '@/lib/bouquets';
import { filterBouquetsCatalogData, filterNewArrivalBouquets } from '@/lib/catalogListLogic';

function bouquet(partial: Partial<Bouquet> & Pick<Bouquet, 'id' | 'nameEn'>): Bouquet {
  return {
    slug: partial.slug ?? partial.id,
    nameTh: '',
    descriptionEn: '',
    descriptionTh: '',
    compositionEn: '',
    compositionTh: '',
    images: [],
    sizes: [{ optionId: 'x', key: 'm', price: 1000, label: 'M', description: 'M', availability: true }],
    ...partial,
  };
}

const NOW = new Date('2026-09-01T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const active = bouquet({
  id: 'a',
  nameEn: 'Active New',
  newArrivalStartedAt: new Date(NOW.getTime() - 5 * DAY_MS).toISOString(),
  isNewArrival: true,
});
const olderActive = bouquet({
  id: 'b',
  nameEn: 'Older New',
  newArrivalStartedAt: new Date(NOW.getTime() - 20 * DAY_MS).toISOString(),
  isNewArrival: true,
});
const expired = bouquet({
  id: 'c',
  nameEn: 'Expired',
  newArrivalStartedAt: new Date(NOW.getTime() - 50 * DAY_MS).toISOString(),
  isNewArrival: false,
});
const ordinary = bouquet({
  id: 'd',
  nameEn: 'Ordinary',
  newArrivalStartedAt: null,
});
const excluded = bouquet({
  id: 'e',
  nameEn: 'Excluded Pattaya',
  newArrivalStartedAt: new Date(NOW.getTime() - 2 * DAY_MS).toISOString(),
  isNewArrival: true,
  excludedDeliveryDestinations: ['PATTAYA'],
});

const filtered = filterNewArrivalBouquets(
  [expired, ordinary, olderActive, excluded, active],
  'CHIANG_MAI',
  NOW
);
assert.deepEqual(
  filtered.map((b) => b.id),
  ['e', 'a', 'b']
);

const pattaya = filterNewArrivalBouquets(
  [expired, ordinary, olderActive, excluded, active],
  'PATTAYA',
  NOW
);
assert.deepEqual(
  pattaya.map((b) => b.id),
  ['a', 'b']
);

const newestCatalog = filterBouquetsCatalogData(
  [ordinary, expired, olderActive, active],
  { sort: 'newest' }
);
assert.deepEqual(
  newestCatalog.bouquets.map((b) => b.id),
  ['a', 'b', 'c', 'd']
);

console.log('newArrivalListLogic.test.ts: all assertions passed');
