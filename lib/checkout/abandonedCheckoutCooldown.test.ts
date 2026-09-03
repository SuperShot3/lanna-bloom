/**
 * Pure unit tests for abandoned-checkout 24h email cooldown helpers.
 * Run: npx tsx lib/checkout/abandonedCheckoutCooldown.test.ts
 */
import assert from 'node:assert/strict';
import {
  ABANDONED_CHECKOUT_EMAIL_COOLDOWN_HOURS,
  isAbandonedCheckoutEmailCooldownActive,
  normalizeCheckoutRecoveryEmail,
  selectLatestAbandonmentPerEmail,
} from './abandonedCheckoutCooldown';

assert.equal(ABANDONED_CHECKOUT_EMAIL_COOLDOWN_HOURS, 24);

assert.equal(normalizeCheckoutRecoveryEmail('Ada@Example.COM'), 'ada@example.com');
assert.equal(normalizeCheckoutRecoveryEmail('  ada@example.com  '), 'ada@example.com');
assert.equal(
  normalizeCheckoutRecoveryEmail('ADA@example.com'),
  normalizeCheckoutRecoveryEmail('ada@EXAMPLE.com')
);

const NOW = new Date('2026-09-02T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

assert.equal(isAbandonedCheckoutEmailCooldownActive(null, NOW), false);
assert.equal(isAbandonedCheckoutEmailCooldownActive(undefined, NOW), false);
assert.equal(isAbandonedCheckoutEmailCooldownActive('', NOW), false);
assert.equal(isAbandonedCheckoutEmailCooldownActive('not-a-date', NOW), false);

const ago23h59m = new Date(NOW.getTime() - (24 * HOUR_MS - 60 * 1000)).toISOString();
assert.equal(
  isAbandonedCheckoutEmailCooldownActive(ago23h59m, NOW),
  true,
  '23h59m ago must still be blocked'
);

const ago24h1m = new Date(NOW.getTime() - (24 * HOUR_MS + 60 * 1000)).toISOString();
assert.equal(
  isAbandonedCheckoutEmailCooldownActive(ago24h1m, NOW),
  false,
  '24h1m ago must be allowed'
);

const agoExact24h = new Date(NOW.getTime() - 24 * HOUR_MS).toISOString();
assert.equal(
  isAbandonedCheckoutEmailCooldownActive(agoExact24h, NOW),
  false,
  'exactly 24h ago is outside the exclusive window'
);

const latest = selectLatestAbandonmentPerEmail([
  {
    id: 'old',
    customer_email: 'Ada@Example.com',
    session_created_at: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'newest',
    customer_email: '  ada@example.com ',
    session_created_at: '2026-09-02T11:00:00.000Z',
  },
  {
    id: 'mid',
    customer_email: 'ADA@EXAMPLE.COM',
    session_created_at: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'other',
    customer_email: 'other@example.com',
    session_created_at: '2026-09-01T12:00:00.000Z',
  },
]);

assert.deepEqual(
  latest.map((row) => row.id),
  ['newest', 'other'],
  'newest cart per email, newest-first across emails'
);

console.log('abandonedCheckoutCooldown tests passed');
