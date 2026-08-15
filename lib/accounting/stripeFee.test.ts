/**
 * Stripe processing-fee helpers for admin accounting.
 * Run: npx tsx lib/accounting/stripeFee.test.ts
 */
import assert from 'node:assert/strict';
import {
  processingFeeForIncome,
  resolveProcessingFeeForIncome,
  netAfterProcessingFee,
  STRIPE_FEE_RATE,
} from './stripeFee';

assert.equal(processingFeeForIncome(1000, 'stripe'), 53);
assert.equal(processingFeeForIncome(100, 'stripe'), Math.round(100 * STRIPE_FEE_RATE * 100) / 100);
assert.equal(processingFeeForIncome(1000, 'cash'), 0);
assert.equal(processingFeeForIncome(1000, 'bank_transfer'), 0);
assert.equal(processingFeeForIncome(1000, 'qr_payment'), 0);
assert.equal(processingFeeForIncome(1000, 'other'), 0);
assert.equal(processingFeeForIncome(0, 'stripe'), 0);
assert.equal(processingFeeForIncome(-10, 'stripe'), 0);

assert.equal(resolveProcessingFeeForIncome(1000, 'stripe', 41.2), 41.2);
assert.equal(resolveProcessingFeeForIncome(1000, 'stripe', 0), 0);
assert.equal(resolveProcessingFeeForIncome(1000, 'stripe', null), 53);
assert.equal(resolveProcessingFeeForIncome(1000, 'stripe', undefined), 53);
assert.equal(resolveProcessingFeeForIncome(1000, 'stripe', Number.NaN), 53);
assert.equal(resolveProcessingFeeForIncome(1000, 'stripe', -1), 53);
assert.equal(resolveProcessingFeeForIncome(1000, 'cash', 41.2), 0, 'non-stripe always 0 even with override');
assert.equal(resolveProcessingFeeForIncome(500, 'bank_transfer', 99), 0);
assert.equal(resolveProcessingFeeForIncome(500, 'qr_payment', 99), 0);
assert.equal(resolveProcessingFeeForIncome(500, 'other', 99), 0);

assert.equal(netAfterProcessingFee(1000, 53), 947);
assert.equal(netAfterProcessingFee(1000, 0), 1000);

console.log('stripeFee.test.ts: ok');
