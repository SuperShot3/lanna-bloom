/**
 * Run: npx tsx lib/admin/catalogPartnerShops.test.ts
 */
import assert from 'node:assert/strict';
import { CATALOG_SYSTEM_PARTNER_LEGACY_ID } from '@/lib/catalog/types';
import { selectablePartnerShops } from '@/lib/admin/catalogPartnerShopTypes';

const SYSTEM = CATALOG_SYSTEM_PARTNER_LEGACY_ID;

const aneelaa = {
  id: 'p-aneelaa',
  name: 'Aneelaa flowers',
  status: 'approved',
  legacySanityId: null,
};
const belove = {
  id: 'p-belove',
  name: 'BeloveFlower',
  status: 'approved',
  legacySanityId: null,
};
const koset = {
  id: 'p-koset',
  name: 'Koset',
  status: 'approved',
  legacySanityId: null,
};
const moddam = {
  id: 'p-moddam',
  name: 'Moddam',
  status: 'approved',
  legacySanityId: null,
};
const lannaBloom = {
  id: 'p-lanna',
  name: 'Lanna Bloom',
  status: 'approved',
  legacySanityId: SYSTEM,
};
const testShop = {
  id: 'p-test',
  name: 'Test shop',
  status: 'approved',
  legacySanityId: null,
};
const disabledShop = {
  id: 'p-disabled',
  name: 'Favorite Shop',
  status: 'disabled',
  legacySanityId: null,
};

const approved = (catalogPartnerId: string) => ({
  status: 'approved',
  catalogPartnerId,
});

assert.deepEqual(
  selectablePartnerShops(
    [approved('p-moddam'), approved('p-aneelaa'), approved('p-koset'), approved('p-belove')],
    [moddam, aneelaa, koset, belove, lannaBloom, testShop]
  ),
  [
    { id: 'p-aneelaa', name: 'Aneelaa flowers' },
    { id: 'p-belove', name: 'BeloveFlower' },
    { id: 'p-koset', name: 'Koset' },
    { id: 'p-moddam', name: 'Moddam' },
  ],
  'keeps approved linked shops and sorts by name'
);

assert.deepEqual(
  selectablePartnerShops(
    [
      { status: 'pending', catalogPartnerId: 'p-test' },
      { status: 'rejected', catalogPartnerId: 'p-test' },
      approved('p-aneelaa'),
    ],
    [aneelaa, testShop]
  ),
  [{ id: 'p-aneelaa', name: 'Aneelaa flowers' }],
  'excludes pending and rejected applications'
);

assert.deepEqual(
  selectablePartnerShops([approved('p-lanna'), approved('p-aneelaa')], [lannaBloom, aneelaa]),
  [{ id: 'p-aneelaa', name: 'Aneelaa flowers' }],
  'excludes the system catalog partner even if an application points at it'
);

assert.deepEqual(
  selectablePartnerShops([approved('p-disabled'), approved('p-koset')], [disabledShop, koset]),
  [{ id: 'p-koset', name: 'Koset' }],
  'excludes disabled catalog partners'
);

assert.deepEqual(
  selectablePartnerShops([], [testShop, lannaBloom]),
  [],
  'catalog-only leftover shops stay hidden unless an approved application links them'
);

assert.deepEqual(
  selectablePartnerShops(
    [approved('p-aneelaa'), approved('p-aneelaa'), { status: 'approved', catalogPartnerId: ' p-aneelaa ' }],
    [aneelaa]
  ),
  [{ id: 'p-aneelaa', name: 'Aneelaa flowers' }],
  'collapses duplicate application links to the same catalog partner'
);

assert.deepEqual(
  selectablePartnerShops(
    [{ status: 'approved', catalogPartnerId: null }, { status: 'approved', catalogPartnerId: '  ' }],
    [aneelaa]
  ),
  [],
  'approved applications without a catalog partner id are skipped'
);

assert.deepEqual(
  selectablePartnerShops([approved('p-missing')], [aneelaa]),
  [],
  'approved applications whose catalog partner row is missing are skipped'
);

console.log('catalogPartnerShops.test.ts: all passed');
