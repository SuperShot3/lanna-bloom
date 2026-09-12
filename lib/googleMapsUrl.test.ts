/**
 * Run: npx tsx lib/googleMapsUrl.test.ts
 */
import assert from 'node:assert/strict';
import { isValidGoogleMapsUrl } from '@/lib/googleMapsUrl';

assert.equal(
  isValidGoogleMapsUrl('https://maps.app.goo.gl/FuWYzkvDdtYhYrVp7?g_st=ic'),
  true
);
assert.equal(isValidGoogleMapsUrl('https://share.google/iCYKFTUNmPaLPw9S5'), true);
assert.equal(isValidGoogleMapsUrl('share.google/iCYKFTUNmPaLPw9S5'), true);
assert.equal(isValidGoogleMapsUrl('https://www.share.google/iCYKFTUNmPaLPw9S5'), true);
assert.equal(isValidGoogleMapsUrl('https://maps.app.goo.gl/abc123'), true);

assert.equal(isValidGoogleMapsUrl('https://share.google/'), false);
assert.equal(isValidGoogleMapsUrl('https://share.google'), false);
assert.equal(isValidGoogleMapsUrl('https://example.com'), false);
assert.equal(isValidGoogleMapsUrl('https://google.com/search?q=flowers'), false);
assert.equal(isValidGoogleMapsUrl('Nimman Road Chiang Mai'), false);
assert.equal(isValidGoogleMapsUrl(''), false);

console.log('googleMapsUrl.test.ts: all passed');
