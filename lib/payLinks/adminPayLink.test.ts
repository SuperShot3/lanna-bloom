/**
 * Admin pay-link payload and validation.
 * Run: npx tsx lib/payLinks/adminPayLink.test.ts
 */
import assert from 'node:assert/strict';
import {
  ADMIN_PAY_LINK_BOUQUET_ID,
  ADMIN_PAY_LINK_SOURCE,
  PAY_LINK_TTL_MS,
  buildAdminPayLinkOrderPayload,
  isAdminPayLinkOrder,
  isPayLinkTimeExpired,
  payLinkOrderStatusPath,
  payLinkUnusableReason,
  stripeCheckoutCustomerEmail,
  validateAdminPayLinkInput,
} from './adminPayLink';
import { deliveryDateFromPreferredTimeSlot } from '../orders/deliveryFields';

const badAmount = validateAdminPayLinkInput({ amount: 0, description: 'Extra balloons' });
assert.equal(badAmount.ok, false);
if (!badAmount.ok) assert.match(badAmount.error, /positive/);

const missingDesc = validateAdminPayLinkInput({ amount: 500, description: '  ' });
assert.equal(missingDesc.ok, false);

const ok = validateAdminPayLinkInput({
  amount: 1400.5,
  description: '  Extra balloons  ',
  customerName: ' Mina ',
  customerEmail: 'mina@example.com',
  phone: '0812345678',
});
assert.equal(ok.ok, true);
if (ok.ok) {
  assert.equal(ok.value.amount, 1400.5);
  assert.equal(ok.value.description, 'Extra balloons');
  assert.equal(ok.value.customerName, 'Mina');
  assert.equal(ok.value.customerEmail, 'mina@example.com');
  assert.equal(ok.value.phone, '0812345678');
}

const badEmail = validateAdminPayLinkInput({
  amount: 100,
  description: 'Fee',
  customerEmail: 'not-an-email',
});
assert.equal(badEmail.ok, false);

const payload = buildAdminPayLinkOrderPayload({
  amount: 2500,
  description: 'Rush delivery surcharge',
});
assert.equal(payload.orderSource, ADMIN_PAY_LINK_SOURCE);
assert.equal(payload.pricing.grandTotal, 2500);
assert.equal(payload.pricing.deliveryFee, 0);
assert.equal(payload.pricing.itemsTotal, 2500);
assert.equal(payload.delivery.address, '');
assert.equal(payload.delivery.preferredTimeSlot, '');
assert.equal(payload.items.length, 1);
assert.equal(payload.items[0].bouquetId, ADMIN_PAY_LINK_BOUQUET_ID);
assert.equal(payload.items[0].bouquetTitle, 'Rush delivery surcharge');
assert.equal(payload.items[0].price, 2500);
assert.equal(payload.items[0].size, '—');
assert.equal(payload.submissionToken, undefined);
assert.equal(payload.payLinkPublicToken, undefined);

assert.equal(isAdminPayLinkOrder({ orderSource: 'admin_pay_link' }), true);
assert.equal(isAdminPayLinkOrder({ order_json: { orderSource: 'admin_pay_link' } }), true);
assert.equal(isAdminPayLinkOrder({ orderSource: 'web' }), false);
assert.equal(isAdminPayLinkOrder({ order_json: { orderSource: 'web' } }), false);

assert.equal(deliveryDateFromPreferredTimeSlot(''), null);
assert.equal(deliveryDateFromPreferredTimeSlot('   '), null);
assert.equal(deliveryDateFromPreferredTimeSlot('09:00–12:00'), null);
assert.equal(deliveryDateFromPreferredTimeSlot('2026-08-15 09:00–12:00'), '2026-08-15');
assert.equal(deliveryDateFromPreferredTimeSlot('2026-08-15'), '2026-08-15');

const created = '2026-08-15T10:00:00.000Z';
const t0 = Date.parse(created);
assert.equal(isPayLinkTimeExpired(created, t0 + PAY_LINK_TTL_MS - 1), false);
assert.equal(isPayLinkTimeExpired(created, t0 + PAY_LINK_TTL_MS), true);
assert.equal(payLinkUnusableReason({}, created, t0 + 60_000), null);
assert.equal(payLinkUnusableReason({}, created, t0 + PAY_LINK_TTL_MS), 'expired');
assert.equal(
  payLinkUnusableReason({ payLinkDisabledAt: '2026-08-15T10:01:00.000Z' }, created, t0 + 1000),
  'disabled'
);

assert.equal(
  stripeCheckoutCustomerEmail({ customer_details: { email: '  mina@example.com  ' } }),
  'mina@example.com'
);
assert.equal(
  stripeCheckoutCustomerEmail({ customer_details: null, customer_email: 'fallback@example.com' }),
  'fallback@example.com'
);
assert.equal(stripeCheckoutCustomerEmail({ customer_details: { email: 'not-an-email' } }), undefined);
assert.equal(stripeCheckoutCustomerEmail({}), undefined);

assert.equal(
  payLinkOrderStatusPath({ orderId: 'LB-2026-JG6JRZPW', publicToken: 'tok_abc' }),
  '/order/LB-2026-JG6JRZPW?token=tok_abc'
);
assert.equal(payLinkOrderStatusPath({ orderId: 'LB-1', publicToken: '  ' }), null);
assert.equal(payLinkOrderStatusPath({ orderId: '', publicToken: 'tok' }), null);
assert.equal(payLinkOrderStatusPath({}), null);

console.log('adminPayLink.test.ts: ok');
