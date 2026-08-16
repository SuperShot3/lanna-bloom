/**
 * Public site URL helpers — run with: npx tsx lib/siteUrl.test.ts
 */
import assert from 'node:assert/strict';
import {
  isLocalHostname,
  normalizePublicBaseUrl,
  upgradeToHttps,
} from './siteUrl';

assert.equal(isLocalHostname('localhost'), true);
assert.equal(isLocalHostname('127.0.0.1'), true);
assert.equal(isLocalHostname('www.lannabloom.shop'), false);

assert.equal(
  normalizePublicBaseUrl('http://www.lannabloom.shop'),
  'https://www.lannabloom.shop'
);
assert.equal(
  normalizePublicBaseUrl('http://www.lannabloom.shop/en'),
  'https://www.lannabloom.shop'
);
assert.equal(
  normalizePublicBaseUrl('www.lannabloom.shop'),
  'https://www.lannabloom.shop'
);
assert.equal(
  normalizePublicBaseUrl('https://www.lannabloom.shop/'),
  'https://www.lannabloom.shop'
);
assert.equal(normalizePublicBaseUrl('http://localhost:3000'), 'http://localhost:3000');
assert.equal(normalizePublicBaseUrl(''), null);

assert.equal(
  upgradeToHttps('http://www.lannabloom.shop/en'),
  'https://www.lannabloom.shop/en'
);
assert.equal(
  upgradeToHttps('http://localhost:3000/en'),
  'http://localhost:3000/en'
);
assert.equal(
  upgradeToHttps('https://www.lannabloom.shop/og/lanna-bloom.jpg'),
  'https://www.lannabloom.shop/og/lanna-bloom.jpg'
);

console.log('siteUrl.test.ts: all assertions passed');
