/**
 * Destination item markup — run with: npm run test:expansion-markup
 */
import assert from 'node:assert/strict';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import type { OrderDeliveryDestinationId } from '@/lib/orders';
import {
  applyExpansionItemMarkupThb,
  EXPANSION_MARKUP_DESTINATIONS,
} from '@/lib/expansionMarkup';

const ISLAND: OrderDeliveryDestinationId[] = ['PHUKET', 'SAMUI', 'KRABI'];
const MARKUP_20: OrderDeliveryDestinationId[] = ['BANGKOK', 'PAI'];
const UNCHANGED: OrderDeliveryDestinationId[] = [
  'CHIANG_MAI',
  'PATTAYA',
  'HUA_HIN',
  'LAMPHUN',
];

assert.deepEqual(
  Array.from(EXPANSION_MARKUP_DESTINATIONS).sort(),
  [...ISLAND, ...MARKUP_20].sort(),
  'markup destinations are Phuket, Samui, Krabi, Bangkok, and Pai'
);

for (const dest of ISLAND) {
  assert.equal(
    applyExpansionItemMarkupThb(890, dest),
    1160,
    `${dest}: 890 → 1160`
  );
  assert.equal(
    applyExpansionItemMarkupThb(applyCatalogDiscountThb(890, 10), dest),
    1040,
    `${dest}: 10% off 890 = 801 → 1040`
  );
}

for (const dest of MARKUP_20) {
  assert.equal(applyExpansionItemMarkupThb(890, dest), 1070, `${dest}: 890 → 1070`);
  assert.equal(
    applyExpansionItemMarkupThb(applyCatalogDiscountThb(890, 10), dest),
    960,
    `${dest}: 10% off 890 = 801 → 960`
  );
}

for (const dest of UNCHANGED) {
  assert.equal(applyExpansionItemMarkupThb(890, dest), 890, `${dest}: 890 unchanged`);
  assert.equal(
    applyExpansionItemMarkupThb(applyCatalogDiscountThb(890, 10), dest),
    801,
    `${dest}: 10% off 890 stays 801`
  );
}

console.log('expansionMarkup.test.ts: ok');
