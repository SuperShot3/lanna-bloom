/**
 * Run: npx tsx lib/promo/topPromoBanner.test.ts
 */
import assert from 'node:assert/strict';
import {
  getActiveTopPromoBannerKind,
  isTopPromoBannerActive,
} from './topPromoBanner';

assert.equal(
  getActiveTopPromoBannerKind(new Date('2026-08-28T12:00:00+07:00')),
  null,
  'no top promo on 28 Aug 2026'
);
assert.equal(isTopPromoBannerActive(new Date('2026-08-28T12:00:00+07:00')), false);

assert.equal(
  getActiveTopPromoBannerKind(new Date('2026-12-20T12:00:00+07:00')),
  'advance',
  'NY10 advance window'
);
assert.equal(
  getActiveTopPromoBannerKind(new Date('2026-12-30T12:00:00+07:00')),
  'peak',
  'New Year spike beats leftover advance'
);
assert.equal(
  getActiveTopPromoBannerKind(new Date('2026-05-20T12:00:00+07:00')),
  'may',
  'May free-delivery window'
);

console.log('topPromoBanner.test.ts: all passed');
