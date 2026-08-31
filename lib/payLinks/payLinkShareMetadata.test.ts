/**
 * Pay-link Open Graph copy.
 * Run: npx tsx lib/payLinks/payLinkShareMetadata.test.ts
 */
import assert from 'node:assert/strict';
import {
  buildPayLinkShareMetadata,
  PAY_LINK_OG_IMAGE_PATH,
  payLinkShareCopy,
  truncatePayLinkOgText,
} from './payLinkShareMetadata';

assert.equal(truncatePayLinkOgText('  Extra   balloons  ', 20), 'Extra balloons');
assert.equal(truncatePayLinkOgText('abcdefghij', 8), 'abcdefg…');

const generic = payLinkShareCopy(null);
assert.equal(generic.title, 'Pay Lanna Bloom');
assert.match(generic.description, /Secure payment/i);

const zero = payLinkShareCopy({ amount: 0, description: 'Extra balloons' });
assert.equal(zero.title, 'Pay Lanna Bloom');

const active = payLinkShareCopy({ amount: 1500, description: 'Extra balloons' });
assert.match(active.title, /1,500/);
assert.match(active.title, /Lanna Bloom/);
assert.equal(active.description, 'Extra balloons');

const meta = buildPayLinkShareMetadata({
  linkId: '3b1c0a8e-4d2f-4a91-8b3c-1d2e3f4a5b6c',
  token: 'secret-token',
  details: { amount: 1500, description: 'Extra balloons' },
});
assert.deepEqual(meta.robots, { index: false, follow: false });
assert.match(String(meta.openGraph?.url), /token=secret-token/);
assert.match(JSON.stringify(meta.openGraph?.images), new RegExp(PAY_LINK_OG_IMAGE_PATH.replace('/', '\\/')));
assert.doesNotMatch(JSON.stringify(meta), /customerName|customerEmail|0812345678/i);

const genericMeta = buildPayLinkShareMetadata({
  linkId: '3b1c0a8e-4d2f-4a91-8b3c-1d2e3f4a5b6c',
  token: '',
  details: null,
});
assert.equal(genericMeta.title, 'Pay Lanna Bloom');
assert.doesNotMatch(String(genericMeta.openGraph?.url), /token=/);

const layoutMeta = buildPayLinkShareMetadata({ linkId: '', token: '', details: null });
assert.match(String(layoutMeta.openGraph?.url), /\/pay$/);
assert.doesNotMatch(String(layoutMeta.openGraph?.url), /\/pay\/pay/);

console.log('payLinkShareMetadata.test.ts: ok');
