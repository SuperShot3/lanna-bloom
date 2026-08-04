/**
 * Destination cart conflict analysis (Feature 4).
 * Run with: npx tsx lib/cart/destinationCartConflicts.test.ts
 */

import {
  analyzeDestinationCartConflicts,
  cartHasDestinationConflicts,
} from './destinationCartConflicts';
import type { CartItem } from '@/contexts/CartContext';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const emptyAddOns = {
  cardType: null,
  cardMessage: '',
  wrappingPreference: null,
  paperColor: null,
  productAddOns: {},
} as CartItem['addOns'];

function bouquet(partial: Partial<CartItem> & Pick<CartItem, 'bouquetId' | 'nameEn'>): CartItem {
  return {
    slug: partial.slug ?? 'rose',
    nameTh: partial.nameTh ?? partial.nameEn,
    size: partial.size ?? {
      optionId: 'std',
      key: 'm',
      label: 'Standard',
      price: 990,
      availability: true,
    },
    addOns: partial.addOns ?? emptyAddOns,
    itemType: 'bouquet',
    ...partial,
  };
}

{
  const items = [
    bouquet({
      bouquetId: 'b1',
      nameEn: 'CM Only',
      excludedDeliveryDestinations: ['PHUKET'],
    }),
  ];
  const conflicts = analyzeDestinationCartConflicts(items, 'PHUKET');
  assert(conflicts.length === 1, 'one exclusion conflict');
  assert(conflicts[0].reason === 'excluded_destination', 'excluded reason');
  assert(conflicts[0].leadTimeWouldHelp === false, 'lead time cannot help');
  assert(cartHasDestinationConflicts(items, 'CHIANG_MAI') === false, 'ok on CM');
}

{
  const items = [
    bouquet({
      bouquetId: 'p1',
      nameEn: 'Teddy',
      itemType: 'plushyToy',
      size: { optionId: 'one', label: 'One size', price: 390 },
    }),
  ];
  const conflicts = analyzeDestinationCartConflicts(items, 'PHUKET');
  assert(conflicts.length === 1, 'non-bouquet on expansion');
  assert(conflicts[0].reason === 'expansion_non_bouquet', 'non-bouquet reason');
  assert(
    analyzeDestinationCartConflicts(items, 'CHIANG_MAI').length === 0,
    'toys ok on CM'
  );
}

{
  const items = [
    bouquet({
      bouquetId: 'b2',
      nameEn: 'With teddy',
      addOns: { ...emptyAddOns, productAddOns: { teddy: true } },
    }),
  ];
  const conflicts = analyzeDestinationCartConflicts(items, 'KRABI');
  assert(conflicts.length === 1, 'addons blocked on expansion');
  assert(conflicts[0].reason === 'expansion_addons', 'addons reason');
}

{
  const items = [
    bouquet({
      bouquetId: 'g1',
      nameEn: 'Gift set',
      itemType: 'product',
      size: {
        optionId: 'one',
        key: 'm',
        label: 'Set',
        price: 500,
        availability: true,
      },
    }),
  ];
  const province = {
    status: 'next_day' as const,
    catalog_enabled: true,
    available_categories: ['flowers', 'gifts'],
  };
  assert(
    analyzeDestinationCartConflicts(items, 'PHUKET', province).length === 0,
    'gifts allowed when listed'
  );
  assert(
    analyzeDestinationCartConflicts(items, 'PHUKET', {
      ...province,
      available_categories: ['flowers'],
    }).length === 1,
    'gifts blocked when not listed'
  );
}

console.log('destinationCartConflicts.test.ts: ok');
