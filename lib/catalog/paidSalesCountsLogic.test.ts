/**
 * Pure unit tests for paid sales folding and the public display threshold.
 * Run: npx tsx lib/catalog/paidSalesCountsLogic.test.ts
 */
import assert from 'node:assert/strict';
import {
  attachPublicSoldCount,
  foldLegacySalesCounts,
  MIN_PUBLIC_SOLD_COUNT,
  publicSoldCount,
} from './paidSalesCountsLogic';

assert.equal(MIN_PUBLIC_SOLD_COUNT, 5);

assert.equal(publicSoldCount(undefined), null);
assert.equal(publicSoldCount(null), null);
assert.equal(publicSoldCount(0), null);
assert.equal(publicSoldCount(4), null);
assert.equal(publicSoldCount(5), 5);
assert.equal(publicSoldCount(12), 12);
assert.equal(publicSoldCount(12.9), 12);

const folded = foldLegacySalesCounts(
  {
    'uuid-rose': 7,
    'legacy-rose': 4,
    'uuid-lily': 2,
    'orphan-old': 9,
    '': 3,
  },
  { 'legacy-rose': 'uuid-rose' }
);

assert.equal(folded['uuid-rose'], 11, 'legacy + current ids for the same bouquet must sum');
assert.equal(folded['uuid-lily'], 2);
assert.equal(folded['orphan-old'], 9, 'unknown stored ids stay keyed as stored');
assert.equal(folded['legacy-rose'], undefined);
assert.equal(folded[''], undefined);

const unpaidIgnored = foldLegacySalesCounts({ 'uuid-rose': 0 }, { 'legacy-rose': 'uuid-rose' });
assert.equal(unpaidIgnored['uuid-rose'], undefined);

const attached = attachPublicSoldCount({ id: 'uuid-rose', name: 'Rose' }, folded);
assert.equal(attached.soldCount, 11);

const hidden = attachPublicSoldCount({ id: 'uuid-lily', name: 'Lily' }, folded);
assert.equal('soldCount' in hidden && hidden.soldCount != null, false);

const original = { id: 'uuid-rose', name: 'Rose' };
attachPublicSoldCount(original, folded);
assert.equal('soldCount' in original, false, 'must not mutate the cached catalog object');

console.log('paidSalesCountsLogic.test.ts: ok');
