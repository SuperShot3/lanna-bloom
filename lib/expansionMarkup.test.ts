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
const UNCHANGED: OrderDeliveryDestinationId[] = [
  'CHIANG_MAI',
  'PATTAYA',
  'HUA_HIN',
  'LAMPHUN',
  'PAI',
];

assert.deepEqual(
  Array.from(EXPANSION_MARKUP_DESTINATIONS).sort(),
  [...ISLAND, 'BANGKOK'].sort(),
  'markup destinations are Phuket, Samui, Krabi, and Bangkok'
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

assert.equal(applyExpansionItemMarkupThb(890, 'BANGKOK'), 1070, 'BANGKOK: 890 → 1070');
assert.equal(
  applyExpansionItemMarkupThb(applyCatalogDiscountThb(890, 10), 'BANGKOK'),
  960,
  'BANGKOK: 10% off 890 = 801 → 960'
);

for (const dest of UNCHANGED) {
  assert.equal(applyExpansionItemMarkupThb(890, dest), 890, `${dest}: 890 unchanged`);
  assert.equal(
    applyExpansionItemMarkupThb(applyCatalogDiscountThb(890, 10), dest),
    801,
    `${dest}: 10% off 890 stays 801`
  );
}

console.log('expansionMarkup.test.ts: ok');
