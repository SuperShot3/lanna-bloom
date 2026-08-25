/**
 * Island item markup — run with: npm run test:expansion-markup
 */
import assert from 'node:assert/strict';
import { applyCatalogDiscountThb } from '@/lib/catalogDiscount';
import type { OrderDeliveryDestinationId } from '@/lib/orders';
import {
  applyExpansionItemMarkupThb,
  EXPANSION_MARKUP_DESTINATIONS,
} from '@/lib/expansionMarkup';

const MARKED_UP: OrderDeliveryDestinationId[] = ['PHUKET', 'SAMUI', 'KRABI'];
const UNCHANGED: OrderDeliveryDestinationId[] = [
  'CHIANG_MAI',
  'PATTAYA',
  'HUA_HIN',
  'BANGKOK',
  'LAMPHUN',
];

assert.deepEqual(
  [...EXPANSION_MARKUP_DESTINATIONS].sort(),
  [...MARKED_UP].sort(),
  'markup destinations are Phuket, Samui, and Krabi'
);

for (const dest of MARKED_UP) {
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

for (const dest of UNCHANGED) {
  assert.equal(applyExpansionItemMarkupThb(890, dest), 890, `${dest}: 890 unchanged`);
  assert.equal(
    applyExpansionItemMarkupThb(applyCatalogDiscountThb(890, 10), dest),
    801,
    `${dest}: 10% off 890 stays 801`
  );
}

console.log('expansionMarkup.test.ts: ok');
