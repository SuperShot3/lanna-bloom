/**
 * Run with: npx tsx lib/email/marketingAudience.test.ts
 */

import { mergeMarketingAudience, marketingSourceLabel, normalizeAudienceEmail } from './marketingAudience';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

assert(normalizeAudienceEmail('  Alex@Shop.COM ') === 'alex@shop.com', 'normalize email');

const merged = mergeMarketingAudience(
  [
    {
      order_id: 'newer',
      customer_email: 'Pat@Shop.com',
      customer_name: 'Pat New',
      created_at: '2026-08-02T00:00:00Z',
    },
    {
      order_id: 'older',
      customer_email: 'pat@shop.com',
      customer_name: 'Pat Old',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      order_id: 'blank',
      customer_email: '   ',
      customer_name: 'Skip',
      created_at: '2026-08-03T00:00:00Z',
    },
  ],
  [
    { email: 'pat@shop.com', source: 'footer', status: 'active' },
    { email: 'news@shop.com', source: 'about', status: 'active' },
    { email: 'gone@shop.com', source: 'footer', status: 'unsubscribed' },
  ]
);

assert(merged.length === 2, `expected 2 rows, got ${merged.length}`);
assert(merged[0].email === 'pat@shop.com', 'checkout row sorts first by last order');
assert(merged[0].customerName === 'Pat New', 'newest order name wins');
assert(merged[0].lastOrderId === 'newer', 'newest order id wins');
assert(merged[0].checkoutConsent === true, 'checkout consent');
assert(merged[0].newsletter === true, 'newsletter merged onto checkout email');
assert(marketingSourceLabel(merged[0]) === 'Checkout + newsletter', 'both sources label');
assert(merged[1].email === 'news@shop.com', 'newsletter-only row');
assert(merged[1].checkoutConsent === false, 'newsletter-only has no checkout');
assert(merged[1].newsletterSource === 'about', 'newsletter source kept');
assert(marketingSourceLabel(merged[1]) === 'Newsletter', 'newsletter-only label');

console.log('marketingAudience.test.ts ok');
