/**
 * Pure PaymentIntent → income payload helpers (no live Stripe / DB).
 * Run: npx tsx lib/accounting/stripePaymentIntentIncome.test.ts
 */
import assert from 'node:assert/strict';
import {
  amountMajorFromStripePaymentIntent,
  buildStripePaymentIntentIncomeDraft,
  isStripePaymentIntentId,
  paidDateFromStripePaymentIntent,
  shouldSkipStripePiIncome,
  unixSecondsToBangkokYmd,
} from './stripePaymentIntentIncome';

assert.equal(isStripePaymentIntentId('pi_3ABC123'), true);
assert.equal(isStripePaymentIntentId('pi_'), false);
assert.equal(isStripePaymentIntentId('ch_123'), false);
assert.equal(isStripePaymentIntentId(''), false);

assert.equal(shouldSkipStripePiIncome('pi_abc', 'pi_abc'), true);
assert.equal(shouldSkipStripePiIncome(null, 'pi_abc'), false);
assert.equal(shouldSkipStripePiIncome('', 'pi_abc'), false);
assert.equal(shouldSkipStripePiIncome('pi_other', 'pi_abc'), false);

assert.equal(amountMajorFromStripePaymentIntent({ amount_received: 150000, amount: 999, currency: 'thb' }), 1500);
assert.equal(amountMajorFromStripePaymentIntent({ amount_received: 0, amount: 20000, currency: 'thb' }), 200);
assert.equal(amountMajorFromStripePaymentIntent({ amount: 20000, currency: 'thb' }), 200);
assert.equal(amountMajorFromStripePaymentIntent({ amount_received: 0, amount: 0, currency: 'thb' }), null);

const utcEvening = Math.floor(Date.parse('2026-08-15T18:00:00.000Z') / 1000);
assert.equal(unixSecondsToBangkokYmd(utcEvening), '2026-08-16', '18:00 UTC is next calendar day in Bangkok');

assert.equal(
  paidDateFromStripePaymentIntent({
    created: utcEvening,
    latest_charge: { created: Math.floor(Date.parse('2026-08-15T10:00:00.000Z') / 1000) },
  }),
  '2026-08-15',
  'charge.created wins over PaymentIntent.created'
);
assert.equal(
  paidDateFromStripePaymentIntent({ created: utcEvening, latest_charge: 'ch_xxx' }),
  '2026-08-16',
  'string charge id falls back to PI.created'
);

const draft = buildStripePaymentIntentIncomeDraft({
  id: 'pi_test123',
  amount_received: 89000,
  amount: 89000,
  currency: 'thb',
  created: utcEvening,
});
assert.ok(draft);
assert.equal(draft.order_id, null);
assert.equal(draft.external_reference, 'pi_test123');
assert.equal(draft.payment_method, 'stripe');
assert.equal(draft.money_location, 'stripe');
assert.equal(draft.source_mode, 'auto_order');
assert.equal(draft.source_type, 'offline_sale');
assert.equal(draft.income_status, 'confirmed');
assert.equal(draft.amount, 890);
assert.equal(draft.currency, 'THB');
assert.equal(draft.paid_date, '2026-08-16');

assert.equal(buildStripePaymentIntentIncomeDraft({ id: 'not_a_pi', amount: 1000, currency: 'thb' }), null);
assert.equal(buildStripePaymentIntentIncomeDraft({ id: 'pi_ok', amount: 0, currency: 'thb' }), null);

console.log('stripePaymentIntentIncome.test.ts: ok');
