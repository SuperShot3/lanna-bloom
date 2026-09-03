/**
 * Run: npx tsx lib/google/parseDeliveryLocationInput.test.ts
 */
import assert from 'node:assert/strict';
import { parseDeliveryLocationInput } from '@/lib/google/parseDeliveryLocationInput';

const coords = parseDeliveryLocationInput('18.7883, 98.9853');
assert.equal(coords.kind, 'coords');
if (coords.kind === 'coords') {
  assert.equal(coords.lat, 18.7883);
  assert.equal(coords.lng, 98.9853);
}

const compact = parseDeliveryLocationInput('18.7883,98.9853');
assert.equal(compact.kind, 'coords');

const spaces = parseDeliveryLocationInput('18.7883 98.9853');
assert.equal(spaces.kind, 'coords');

const semicolon = parseDeliveryLocationInput('18.7883;98.9853');
assert.equal(semicolon.kind, 'coords');

assert.equal(parseDeliveryLocationInput('91, 98.9853').kind, 'invalid');
assert.equal(parseDeliveryLocationInput('18.7883, 200').kind, 'invalid');
assert.equal(parseDeliveryLocationInput('18.7883').kind, 'invalid');
assert.equal(parseDeliveryLocationInput('Nimman Road Chiang Mai').kind, 'invalid');
assert.equal(parseDeliveryLocationInput('hello world').kind, 'invalid');
assert.equal(parseDeliveryLocationInput('https://example.com').kind, 'invalid');

const placeAt = parseDeliveryLocationInput(
  'https://www.google.com/maps/place/Chiang+Mai/@18.7883,98.9853,17z'
);
assert.equal(placeAt.kind, 'mapsUrl');
if (placeAt.kind === 'mapsUrl') {
  assert.equal(placeAt.lat, 18.7883);
  assert.equal(placeAt.lng, 98.9853);
}

const placePin = parseDeliveryLocationInput(
  'https://www.google.com/maps/place/Chiang+Mai/@18.7883,98.9853,17z/data=!3d18.7877!4d98.9931'
);
assert.equal(placePin.kind, 'mapsUrl');
if (placePin.kind === 'mapsUrl') {
  assert.equal(placePin.lat, 18.7877);
  assert.equal(placePin.lng, 98.9931);
}

const searchQuery = parseDeliveryLocationInput(
  'https://www.google.com/maps/search/?api=1&query=18.7883%2C98.9853'
);
assert.equal(searchQuery.kind, 'mapsUrl');
if (searchQuery.kind === 'mapsUrl') {
  assert.equal(searchQuery.lat, 18.7883);
  assert.equal(searchQuery.lng, 98.9853);
}

const shortLink = parseDeliveryLocationInput('https://maps.app.goo.gl/abc123');
assert.equal(shortLink.kind, 'mapsUrl');
if (shortLink.kind === 'mapsUrl') {
  assert.equal(shortLink.lat, null);
  assert.equal(shortLink.lng, null);
  assert.equal(shortLink.url, 'https://maps.app.goo.gl/abc123');
}

const noScheme = parseDeliveryLocationInput('maps.app.goo.gl/abc123');
assert.equal(noScheme.kind, 'mapsUrl');
if (noScheme.kind === 'mapsUrl') {
  assert.equal(noScheme.url, 'https://maps.app.goo.gl/abc123');
  assert.equal(noScheme.lat, null);
}

console.log('parseDeliveryLocationInput.test.ts: all passed');
