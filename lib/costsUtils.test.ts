import { strict as assert } from 'node:assert';
import { isPartnerWholesaleCost } from './costsUtils';

assert.equal(
  isPartnerWholesaleCost({
    itemType: 'product',
    cost: 800,
    commissionPercent: 20,
  }),
  true,
  'partner catalog product with commission is wholesale'
);

assert.equal(
  isPartnerWholesaleCost({
    itemType: 'product',
    cost: 800,
    commissionAmount: 160,
  }),
  true,
  'order line with commission_amount is wholesale'
);

assert.equal(
  isPartnerWholesaleCost({
    itemType: 'product',
    cost: 2290,
    commissionPercent: 0,
  }),
  false,
  'own catalog product copies sell price into cost'
);

assert.equal(
  isPartnerWholesaleCost({
    itemType: 'product',
    cost: 2290,
    commissionAmount: 0,
  }),
  false,
  'own-product order line must not prefill COGS'
);

assert.equal(
  isPartnerWholesaleCost({
    itemType: 'bouquet',
    cost: 500,
    commissionAmount: 100,
  }),
  false,
  'bouquets are never partner wholesale cost'
);

assert.equal(
  isPartnerWholesaleCost({
    itemType: 'product',
    cost: null,
    commissionPercent: 25,
  }),
  false,
  'missing cost is not wholesale'
);
