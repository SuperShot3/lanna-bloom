/**
 * Pure unit tests for contact-before-order checkout gating.
 * Run: npx tsx lib/catalog/contactBeforeOrder.test.ts
 */
import assert from 'node:assert/strict';
import {
  CONTACT_BEFORE_ORDER_CHECKOUT_MESSAGE,
  contactBeforeOrderBlocksCheckout,
} from './contactBeforeOrder';

assert.equal(contactBeforeOrderBlocksCheckout(undefined), false);
assert.equal(contactBeforeOrderBlocksCheckout(null), false);
assert.equal(contactBeforeOrderBlocksCheckout({}), false);
assert.equal(contactBeforeOrderBlocksCheckout({ contactBeforeOrder: false }), false);
assert.equal(contactBeforeOrderBlocksCheckout({ contactBeforeOrder: true }), true);
assert.ok(CONTACT_BEFORE_ORDER_CHECKOUT_MESSAGE.includes('LINE'));
assert.ok(CONTACT_BEFORE_ORDER_CHECKOUT_MESSAGE.includes('WhatsApp'));
assert.ok(CONTACT_BEFORE_ORDER_CHECKOUT_MESSAGE.includes('email'));

console.log('contactBeforeOrder.test.ts: all assertions passed');
