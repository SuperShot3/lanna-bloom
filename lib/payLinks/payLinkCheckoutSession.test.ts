/**
 * Pay-link Stripe session helpers (reuse + stable create params).
 * Run: npx tsx lib/payLinks/payLinkCheckoutSession.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildStablePayLinkCheckoutSessionParams,
  isPayLinkDraftId,
  isReusableOpenPayLinkSession,
  lookupStoredPayLinkCheckoutSession,
  payLinkCheckoutIdempotencyKey,
  stripeCustomerEmailOrOmit,
} from './payLinkCheckoutSession';

assert.equal(isPayLinkDraftId('3b1c0a8e-4d2f-4a91-8b3c-1d2e3f4a5b6c'), true);
assert.equal(isPayLinkDraftId('LB-1001'), false);
assert.equal(isPayLinkDraftId(''), false);

assert.equal(stripeCustomerEmailOrOmit(undefined), undefined);
assert.equal(stripeCustomerEmailOrOmit(''), undefined);
assert.equal(stripeCustomerEmailOrOmit('   '), undefined);
assert.equal(stripeCustomerEmailOrOmit(' mina@example.com '), 'mina@example.com');

assert.equal(isReusableOpenPayLinkSession({ status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_test' }), true);
assert.equal(isReusableOpenPayLinkSession({ status: 'expired', url: 'https://checkout.stripe.com/c/pay/cs_test' }), false);
assert.equal(isReusableOpenPayLinkSession({ status: 'open', url: null }), false);
assert.equal(isReusableOpenPayLinkSession({ status: 'complete', url: 'https://checkout.stripe.com/c/pay/cs_test' }), false);

assert.equal(payLinkCheckoutIdempotencyKey('draft', 'draft-1'), 'pay-link-draft-draft-1');
assert.equal(
  payLinkCheckoutIdempotencyKey('draft', 'draft-1', 'cs_dead'),
  'pay-link-draft-draft-1-cs_dead'
);
assert.equal(payLinkCheckoutIdempotencyKey('order', 'LB-9'), 'pay-link-LB-9');
assert.equal(payLinkCheckoutIdempotencyKey('order', 'LB-9', '  cs_old  '), 'pay-link-LB-9-cs_old');

const params = buildStablePayLinkCheckoutSessionParams({
  lineItems: [
    {
      quantity: 1,
      price_data: { currency: 'thb', unit_amount: 150000, product_data: { name: 'Extra balloons' } },
    },
  ],
  clientReferenceId: 'draft-1',
  customerEmail: '  ',
  successUrl: 'https://lannabloom.shop/pay/draft-1?token=abc&session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'https://lannabloom.shop/pay/draft-1?token=abc&cancelled=1',
  metadata: { source: 'lanna_bloom_pay_link', checkout_draft_id: 'draft-1' },
});
assert.equal('expires_at' in params, false);
assert.equal(params.expires_at, undefined);
assert.equal('customer_email' in params, false);
assert.equal(params.mode, 'payment');
assert.equal(params.client_reference_id, 'draft-1');

const withEmail = buildStablePayLinkCheckoutSessionParams({
  lineItems: params.line_items ?? [],
  clientReferenceId: 'draft-1',
  customerEmail: 'mina@example.com',
  successUrl: params.success_url ?? '',
  cancelUrl: params.cancel_url ?? '',
  metadata: { source: 'lanna_bloom_pay_link' },
});
assert.equal(withEmail.customer_email, 'mina@example.com');
assert.equal('expires_at' in withEmail, false);

async function testStoredSessionLookup() {
  const open = await lookupStoredPayLinkCheckoutSession(
    async () => ({
      status: 'open',
      url: 'https://checkout.stripe.com/c/pay/cs_live',
    }),
    'cs_123'
  );
  assert.deepEqual(open, { kind: 'open', url: 'https://checkout.stripe.com/c/pay/cs_live' });

  const dead = await lookupStoredPayLinkCheckoutSession(
    async () => ({
      status: 'expired',
      url: 'https://checkout.stripe.com/c/pay/cs_old',
    }),
    'cs_old'
  );
  assert.deepEqual(dead, { kind: 'dead', sessionId: 'cs_old' });

  const missing = await lookupStoredPayLinkCheckoutSession(async () => {
    throw new Error('No such checkout.session');
  }, 'cs_gone');
  assert.deepEqual(missing, { kind: 'dead', sessionId: 'cs_gone' });

  const none = await lookupStoredPayLinkCheckoutSession(
    async () => ({ status: 'open', url: 'x' }),
    '  '
  );
  assert.deepEqual(none, { kind: 'none' });
}

testStoredSessionLookup()
  .then(() => {
    console.log('payLinkCheckoutSession.test.ts: ok');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
