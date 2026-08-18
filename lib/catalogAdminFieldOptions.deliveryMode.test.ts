/**
 * Pure unit tests for exclusive delivery speed / contact-before-order.
 * Run: npx tsx lib/catalogAdminFieldOptions.deliveryMode.test.ts
 */
import assert from 'node:assert/strict';
import {
  exclusiveDeliveryMode,
  exclusiveDeliverySpeedOnChange,
  exclusiveDeliverySpeedOptions,
} from './catalogAdminFieldOptions';

assert.deepEqual(exclusiveDeliverySpeedOptions(['same_day', 'next_day']), ['next_day']);
assert.deepEqual(exclusiveDeliverySpeedOptions(['same_day']), ['same_day']);
assert.deepEqual(exclusiveDeliverySpeedOptions([]), []);

assert.deepEqual(
  exclusiveDeliverySpeedOnChange(['same_day'], ['same_day', 'next_day']),
  ['next_day']
);
assert.deepEqual(exclusiveDeliverySpeedOnChange(['same_day', 'next_day'], ['same_day']), ['same_day']);

assert.deepEqual(exclusiveDeliveryMode({ contactBeforeOrder: true, deliveryOptions: ['same_day'] }), {
  deliveryOptions: [],
  contactBeforeOrder: true,
});
assert.deepEqual(
  exclusiveDeliveryMode({ contactBeforeOrder: false, deliveryOptions: ['same_day', 'next_day'] }),
  { deliveryOptions: ['same_day', 'next_day'], contactBeforeOrder: false }
);

console.log('catalogAdminFieldOptions.deliveryMode.test.ts: all assertions passed');
