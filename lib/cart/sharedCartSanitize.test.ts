/**
 * Shared cart sanitizer (destination, zone, balloon text).
 * Run with: npx tsx lib/cart/sharedCartSanitize.test.ts
 */

import {
  sanitizeCartItemsForShare,
  sanitizeSharedCartForm,
  SharedCartValidationError,
} from './sharedCartSanitize';
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
    quantity: 1,
    ...partial,
  };
}

{
  const items = sanitizeCartItemsForShare([
    bouquet({
      bouquetId: 'b1',
      nameEn: 'Rose',
      addOns: { ...emptyAddOns, cardMessage: 'secret note' },
    }),
  ]);
  assert(items.length === 1, 'one line');
  assert(items[0].addOns.cardMessage === '', 'card message stripped');
}

{
  const items = sanitizeCartItemsForShare([
    bouquet({
      bouquetId: 'balloon-1',
      nameEn: 'Happy balloon',
      itemType: 'balloon',
      addOns: { ...emptyAddOns, balloonText: '  Happy Birthday Anna  ' },
    }),
  ]);
  assert(items[0].addOns.balloonText === 'Happy Birthday Anna', 'balloon text kept and normalized');
}

{
  try {
    sanitizeCartItemsForShare([]);
    assert(false, 'empty cart should throw');
  } catch (err) {
    assert(err instanceof SharedCartValidationError, 'empty cart validation error');
  }
}

{
  const form = sanitizeSharedCartForm({
    delivery: {
      addressLine: 'Sukhumvit Soi 11',
      date: '2026-08-26',
      timeSlot: '12:00–15:00',
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryDestination: 'BANGKOK',
      deliveryZoneId: 'bkk-sukhumvit',
    },
    customerName: 'Alex',
    customerEmail: 'alex@example.com',
    countryCode: '66',
    phoneNational: '0812345678',
    recipientName: '',
    recipientCountryCode: '66',
    recipientPhoneNational: '',
    contactPreference: ['phone'],
  });
  assert(form !== null, 'bangkok form kept');
  assert(form!.delivery.deliveryDestination === 'BANGKOK', 'bangkok destination');
  assert(form!.delivery.deliveryZoneId === 'bkk-sukhumvit', 'bangkok zone kept');
  assert(form!.delivery.addressLine === 'Sukhumvit Soi 11', 'address kept');
  assert(form!.customerName === 'Alex', 'name kept');
}

{
  const form = sanitizeSharedCartForm({
    delivery: {
      addressLine: 'Nimman',
      date: '2026-08-26',
      timeSlot: '09:00–12:00',
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryDestination: 'CHIANG_MAI',
      deliveryZoneId: 'cm-mueang-central',
    },
    customerName: '',
    customerEmail: '',
    countryCode: '66',
    phoneNational: '',
    recipientName: '',
    recipientCountryCode: '66',
    recipientPhoneNational: '',
    contactPreference: ['phone'],
  });
  assert(form !== null, 'chiang mai form kept');
  assert(form!.delivery.deliveryDestination === 'CHIANG_MAI', 'cm destination');
  assert(form!.delivery.deliveryZoneId === 'cm-mueang-central', 'cm zone kept');
}

{
  const form = sanitizeSharedCartForm({
    delivery: {
      addressLine: '',
      date: '',
      timeSlot: '',
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryDestination: 'BANGKOK',
      deliveryZoneId: 'cm-mueang-central',
    },
    customerName: '',
    customerEmail: '',
    countryCode: '66',
    phoneNational: '',
    recipientName: '',
    recipientCountryCode: '66',
    recipientPhoneNational: '',
    contactPreference: ['phone'],
  });
  assert(form !== null, 'valid dest with bad zone still kept');
  assert(form!.delivery.deliveryDestination === 'BANGKOK', 'dest kept when zone mismatches');
  assert(form!.delivery.deliveryZoneId === '', 'mismatched zone cleared');
}

{
  const form = sanitizeSharedCartForm({
    delivery: {
      addressLine: '',
      date: '',
      timeSlot: '',
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryDestination: 'NOT_A_CITY',
      deliveryZoneId: 'bkk-sukhumvit',
    },
    customerName: 'Alex',
    customerEmail: '',
    countryCode: '66',
    phoneNational: '',
    recipientName: '',
    recipientCountryCode: '66',
    recipientPhoneNational: '',
    contactPreference: ['phone'],
  });
  assert(form === null, 'unknown city omitted');
}

{
  const form = sanitizeSharedCartForm({
    delivery: {
      addressLine: '',
      date: '',
      timeSlot: '',
      deliveryLat: null,
      deliveryLng: null,
      deliveryGoogleMapsUrl: null,
      deliveryDestination: 'CHIANG_MAI',
      deliveryZoneId: 'cm-fang',
    },
    customerName: '',
    customerEmail: '',
    countryCode: '66',
    phoneNational: '',
    recipientName: '',
    recipientCountryCode: '66',
    recipientPhoneNational: '',
    contactPreference: ['phone'],
  });
  assert(form !== null, 'manual quote dest kept');
  assert(form!.delivery.deliveryZoneId === '', 'manual-quote zone dropped');
}

{
  const form = sanitizeSharedCartForm(null);
  assert(form === null, 'null form omitted');
}

console.log('sharedCartSanitize.test.ts: ok');
