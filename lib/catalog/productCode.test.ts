/**
 * Run: npx tsx lib/catalog/productCode.test.ts
 */
import assert from 'node:assert/strict';
import {
  catalogProductCodeOrId,
  feedIdentifierExists,
  feedMpn,
  formatCatalogProductCode,
  isCatalogProductCode,
} from '@/lib/catalog/productCode';

assert.equal(formatCatalogProductCode(1), 'LB-001');
assert.equal(formatCatalogProductCode(9), 'LB-009');
assert.equal(formatCatalogProductCode(99), 'LB-099');
assert.equal(formatCatalogProductCode(100), 'LB-100');
assert.equal(formatCatalogProductCode(1000), 'LB-1000');
assert.equal(isCatalogProductCode('LB-009'), true);
assert.equal(isCatalogProductCode('LB-1000'), true);
assert.equal(isCatalogProductCode('lb-009'), false);
assert.equal(isCatalogProductCode('LB-WR-009'), false);
assert.equal(catalogProductCodeOrId({ id: 'uuid', productCode: 'LB-001' }), 'LB-001');
assert.equal(catalogProductCodeOrId({ id: 'uuid' }), 'uuid');
assert.equal(feedMpn('LB-001'), 'LB-001');
assert.equal(feedMpn(undefined), '');
assert.equal(feedIdentifierExists('LB-001'), 'yes');
assert.equal(feedIdentifierExists(''), 'no');

console.log('productCode.test.ts: all passed');
