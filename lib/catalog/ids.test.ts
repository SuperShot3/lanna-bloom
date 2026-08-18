/**
 * Run: npx tsx lib/catalog/ids.test.ts
 */
import assert from 'node:assert/strict';
import { isCatalogUuid, isInvalidUuidQueryError } from '@/lib/catalog/ids';

assert.equal(isCatalogUuid('custom-order-request'), false);
assert.equal(isCatalogUuid('pay-link'), false);
assert.equal(isCatalogUuid('legacy.sanity-id'), false);
assert.equal(isCatalogUuid(''), false);
assert.equal(isCatalogUuid(null), false);
assert.equal(
  isCatalogUuid('550e8400-e29b-41d4-a716-446655440000'),
  true
);
assert.equal(isInvalidUuidQueryError({ code: '22P02', message: 'invalid input syntax for type uuid: "pay-link"' }), true);
assert.equal(isInvalidUuidQueryError({ code: 'PGRST116', message: 'not found' }), false);

console.log('ids.test.ts: all passed');
