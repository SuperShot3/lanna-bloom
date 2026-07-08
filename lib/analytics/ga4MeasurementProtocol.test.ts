/**
 * Payload builder assertions for GA4 Measurement Protocol purchase.
 * Run: npx tsx lib/analytics/ga4MeasurementProtocol.test.ts
 */

import {
  buildGa4MpPurchaseBody,
  coerceGa4SessionId,
  getGa4MpEndpointHost,
  resolveTimestampMicros,
} from './ga4MpPayload';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// --- coerceGa4SessionId ---
assert(coerceGa4SessionId('1712345678') === 1712345678, 'digits → number');
assert(coerceGa4SessionId(' 99 ') === 99, 'trimmed digits');
assert(coerceGa4SessionId('abc') === undefined, 'alpha omitted');
assert(coerceGa4SessionId('12ab') === undefined, 'alphanumeric omitted');
assert(coerceGa4SessionId('') === undefined, 'empty omitted');
assert(coerceGa4SessionId(null) === undefined, 'null omitted');

// --- resolveTimestampMicros ---
const now = Date.parse('2026-07-08T12:00:00.000Z');
const paidIso = '2026-07-08T11:30:00.000Z';
const paidMs = Date.parse(paidIso);
assert(resolveTimestampMicros(paidIso, now) === paidMs * 1000, 'paid_at within 72h → micros');
assert(resolveTimestampMicros(null, now) === now * 1000, 'missing paid_at → now');
const stale = '2020-01-01T00:00:00.000Z';
assert(resolveTimestampMicros(stale, now) === now * 1000, 'stale >72h → now');

// --- buildGa4MpPurchaseBody ---
const processStart = now - 42;
const built = buildGa4MpPurchaseBody(
  {
    transactionId: 'ORD-TEST-1',
    value: 1250,
    currency: 'THB',
    items: [{ item_id: 'p1', item_name: 'Rose', price: 1000, quantity: 1 }],
    clientId: '1234567890.0987654321',
    sessionId: '1712345678',
    paidAt: paidIso,
  },
  { processStartMs: processStart, nowMs: now },
);

assert(!('error' in built), 'build succeeds');
if ('error' in built) throw new Error(built.error);

const { body } = built;
assert(typeof body.client_id === 'string', 'client_id string');
assert(typeof body.timestamp_micros === 'number', 'timestamp_micros int');
assert(Number.isInteger(body.timestamp_micros), 'timestamp_micros is integer');
assert(body.events.length === 1 && body.events[0].name === 'purchase', 'purchase event');

const params = body.events[0].params;
assert(params.session_id === 1712345678, 'session_id is number');
assert(typeof params.session_id === 'number', 'session_id typeof number');
assert(params.engagement_time_msec === 42, 'engagement_time_msec elapsed');
assert(typeof params.engagement_time_msec === 'number', 'engagement_time_msec int');
assert(Array.isArray(params.items), 'items array (ecommerce structure)');
assert(params.transaction_id === 'ORD-TEST-1', 'transaction_id flat param');

const badSession = buildGa4MpPurchaseBody(
  {
    transactionId: 'ORD-TEST-2',
    value: 100,
    currency: 'THB',
    items: [{ item_id: 'p1', item_name: 'Rose', price: 100, quantity: 1 }],
    sessionId: 'not-a-number',
  },
  { processStartMs: now, nowMs: now },
);
assert(!('error' in badSession), 'build with bad session still ok');
if (!('error' in badSession)) {
  assert(badSession.body.events[0].params.session_id === undefined, 'invalid session_id omitted');
}

assert(getGa4MpEndpointHost().includes('google-analytics.com'), 'default host');
assert(!getGa4MpEndpointHost().includes('www.'), 'non-www default host');

console.log('ga4MeasurementProtocol.test.ts: all assertions passed');
