/**
 * Period overview refund allocation.
 * Run: npx tsx lib/accounting/allocateOverviewRefunds.test.ts
 */
import assert from 'node:assert/strict';
import { allocateOverviewRefunds } from './allocateOverviewRefunds';

function income(partial: {
  order_id?: string | null;
  amount: number;
  payment_method: string;
  processing_fee_amount?: number | null;
  income_status?: string;
}) {
  return {
    order_id: partial.order_id ?? 'ord-1',
    amount: partial.amount,
    payment_method: partial.payment_method,
    processing_fee_amount: partial.processing_fee_amount ?? null,
    income_status: partial.income_status ?? 'confirmed',
  };
}

function refund(partial: {
  order_id?: string | null;
  amount: number;
  source?: string;
  retained_fee_amount?: number | null;
}) {
  return {
    order_id: partial.order_id ?? 'ord-1',
    amount: partial.amount,
    source: partial.source ?? 'manual',
    retained_fee_amount: partial.retained_fee_amount ?? null,
  };
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [income({ amount: 1000, payment_method: 'stripe', processing_fee_amount: 40 })],
    refunds: [refund({ amount: 1000, retained_fee_amount: 40 })],
  });
  assert.equal(r.confirmedIncomeCount, 0);
  assert.equal(r.confirmedIncome, 0);
  assert.equal(r.stripeConfirmedGross, 0);
  assert.equal(r.offStripeNetAfterRefunds, 0);
  assert.equal(r.refundsPnlAmount, 0);
  assert.equal(r.totalRefunds, 1000);
  assert.equal(r.refundsCount, 1);
  assert.equal(r.retainedStripeFeesOnRefunds, 40);
  assert.equal(r.stripeNetVolumeAfterRefunds, -40);
  assert.equal(r.confirmedIncomeNetAfterRefunds, -40);
  assert.equal(r.stripeProcessingFees, 0);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [income({ amount: 1000, payment_method: 'bank_transfer', processing_fee_amount: 0 })],
    refunds: [refund({ amount: 1000, source: 'manual', retained_fee_amount: 0 })],
  });
  assert.equal(r.confirmedIncomeCount, 0);
  assert.equal(r.offStripeConfirmedGross, 0);
  assert.equal(r.offStripeNetAfterRefunds, 0);
  assert.equal(r.stripeConfirmedGross, 0);
  assert.equal(r.retainedStripeFeesOnRefunds, 0);
  assert.equal(r.confirmedIncomeNetAfterRefunds, 0);
  assert.equal(r.totalRefunds, 1000);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [income({ amount: 1000, payment_method: 'stripe', processing_fee_amount: 40 })],
    refunds: [refund({ amount: 300, retained_fee_amount: 40 })],
  });
  assert.equal(r.confirmedIncomeCount, 1);
  assert.equal(r.stripeConfirmedGross, 1000);
  assert.equal(r.stripeConfirmedNetBeforeRefunds, 960);
  assert.equal(r.stripeProcessingFees, 40);
  assert.equal(r.retainedStripeFeesOnRefunds, 0);
  assert.equal(r.refundsPnlAmount, 300);
  assert.equal(r.stripeNetVolumeAfterRefunds, 660);
  assert.equal(r.offStripeNetAfterRefunds, 0);
  assert.equal(r.confirmedIncomeNetAfterRefunds, 660);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [income({ amount: 1000, payment_method: 'stripe', processing_fee_amount: 40 })],
    refunds: [],
  });
  assert.equal(r.confirmedIncomeCount, 1);
  assert.equal(r.stripeConfirmedGross, 1000);
  assert.equal(r.stripeNetVolumeAfterRefunds, 960);
  assert.equal(r.confirmedIncomeNetAfterRefunds, 960);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [
      income({ order_id: 'keep', amount: 500, payment_method: 'cash', processing_fee_amount: 0 }),
    ],
    refunds: [refund({ order_id: 'ord-1', amount: 1000, source: 'manual', retained_fee_amount: 40 })],
  });
  assert.equal(r.confirmedIncomeCount, 1);
  assert.equal(r.offStripeNetAfterRefunds, 500, 'prior-period refund must not hit Non-Stripe income');
  assert.equal(r.refundsPnlAmount, 1000);
  assert.equal(r.retainedStripeFeesOnRefunds, 40);
  assert.equal(r.stripeNetVolumeAfterRefunds, -1040);
  assert.equal(r.confirmedIncomeNetAfterRefunds, -540);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [
      income({ order_id: 'keep', amount: 500, payment_method: 'cash', processing_fee_amount: 0 }),
    ],
    refunds: [refund({ order_id: 'old-stripe', amount: 1000, source: 'manual', retained_fee_amount: null })],
    incomeLookup: [
      income({
        order_id: 'old-stripe',
        amount: 1000,
        payment_method: 'stripe',
        processing_fee_amount: 40,
      }),
    ],
  });
  assert.equal(r.offStripeNetAfterRefunds, 500);
  assert.equal(r.refundsPnlAmount, 1000);
  assert.equal(r.retainedStripeFeesOnRefunds, 40);
  assert.equal(r.stripeNetVolumeAfterRefunds, -1040);
  assert.equal(r.confirmedIncomeNetAfterRefunds, -540);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [
      income({ order_id: 'keep', amount: 500, payment_method: 'cash', processing_fee_amount: 0 }),
    ],
    refunds: [refund({ order_id: 'old-stripe', amount: 1000, source: 'stripe' })],
  });
  assert.equal(r.offStripeNetAfterRefunds, 500);
  assert.equal(r.stripeNetVolumeAfterRefunds, -1000);
  assert.equal(r.refundsPnlAmount, 1000);
  assert.equal(r.confirmedIncomeNetAfterRefunds, -500);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [income({ amount: 1000, payment_method: 'stripe', processing_fee_amount: 40 })],
    refunds: [refund({ amount: 1000, retained_fee_amount: null })],
  });
  assert.equal(r.retainedStripeFeesOnRefunds, 40);
  assert.equal(r.stripeNetVolumeAfterRefunds, -40);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [
      income({ order_id: 's', amount: 1000, payment_method: 'stripe', processing_fee_amount: 40 }),
      income({ order_id: 'b', amount: 200, payment_method: 'bank_transfer', processing_fee_amount: 0 }),
    ],
    refunds: [refund({ order_id: 's', amount: 1000, retained_fee_amount: 40 })],
  });
  assert.equal(r.confirmedIncomeCount, 1);
  assert.equal(r.offStripeNetAfterRefunds, 200);
  assert.equal(r.stripeConfirmedGross, 0);
  assert.equal(r.confirmedIncomeNetAfterRefunds, 160);
}

{
  const r = allocateOverviewRefunds({
    incomeRows: [],
    refunds: [{ order_id: null, amount: 250, source: 'stripe', retained_fee_amount: null }],
  });
  assert.equal(r.stripeNetVolumeAfterRefunds, -250);
  assert.equal(r.offStripeNetAfterRefunds, 0);
  assert.equal(r.refundsPnlAmount, 250);
}

console.log('allocateOverviewRefunds.test.ts: ok');
