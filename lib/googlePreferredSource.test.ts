import assert from 'node:assert/strict';
import {
  GOOGLE_PREFERRED_SOURCE_HOSTNAME,
  getGooglePreferredSourceDeeplink,
} from './googlePreferredSource';

assert.equal(GOOGLE_PREFERRED_SOURCE_HOSTNAME, 'www.lannabloom.shop');
assert.equal(
  getGooglePreferredSourceDeeplink(),
  'https://www.google.com/preferences/source?q=www.lannabloom.shop'
);

console.log('googlePreferredSource.test.ts: ok');
