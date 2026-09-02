/**
 * Pure unit tests for New Arrival window helpers.
 * Run: npx tsx lib/catalog/newArrival.test.ts
 */
import assert from 'node:assert/strict';
import {
  NEW_ARRIVAL_WINDOW_DAYS,
  compareBouquetsByNewest,
  isCatalogNewArrival,
  newArrivalExpiresAt,
  resolveNewArrivalStartedAtFromAdminToggle,
  resolveNewArrivalStartedAtOnApprove,
  shouldPersistNewArrivalAdminIntent,
} from './newArrival';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-01T12:00:00.000Z');

assert.equal(NEW_ARRIVAL_WINDOW_DAYS, 45);

assert.equal(isCatalogNewArrival(null, NOW), false);
assert.equal(isCatalogNewArrival(undefined, NOW), false);
assert.equal(isCatalogNewArrival('', NOW), false);
assert.equal(isCatalogNewArrival('not-a-date', NOW), false);

const started = new Date(NOW.getTime() - 10 * DAY_MS).toISOString();
assert.equal(isCatalogNewArrival(started, NOW), true);

const justStarted = NOW.toISOString();
assert.equal(isCatalogNewArrival(justStarted, NOW), true);

const day44 = new Date(NOW.getTime() - 44 * DAY_MS).toISOString();
assert.equal(isCatalogNewArrival(day44, NOW), true);

const day45Exact = new Date(NOW.getTime() - 45 * DAY_MS).toISOString();
assert.equal(isCatalogNewArrival(day45Exact, NOW), false);

const day46 = new Date(NOW.getTime() - 46 * DAY_MS).toISOString();
assert.equal(isCatalogNewArrival(day46, NOW), false);

const future = new Date(NOW.getTime() + DAY_MS).toISOString();
assert.equal(isCatalogNewArrival(future, NOW), false);

const expires = newArrivalExpiresAt(started);
assert.ok(expires);
assert.equal(
  new Date(expires!).getTime(),
  new Date(started).getTime() + 45 * DAY_MS
);
assert.equal(newArrivalExpiresAt(null), null);

// First approval → auto-start
assert.equal(
  resolveNewArrivalStartedAtOnApprove({
    previousStartedAt: null,
    previouslyApprovedAt: null,
    now: NOW,
  }),
  NOW.toISOString()
);

// Keep existing window on re-approve
assert.equal(
  resolveNewArrivalStartedAtOnApprove({
    previousStartedAt: started,
    previouslyApprovedAt: started,
    now: NOW,
  }),
  started
);

// Admin ended (NULL) + prior approved_at → do not auto-restart
assert.equal(
  resolveNewArrivalStartedAtOnApprove({
    previousStartedAt: null,
    previouslyApprovedAt: '2026-01-01T00:00:00.000Z',
    now: NOW,
  }),
  null
);

// Admin toggle off → NULL
assert.equal(
  resolveNewArrivalStartedAtFromAdminToggle({
    enabled: false,
    previousStartedAt: started,
    now: NOW,
  }),
  null
);

// Admin toggle on while active → keep timestamp
assert.equal(
  resolveNewArrivalStartedAtFromAdminToggle({
    enabled: true,
    previousStartedAt: started,
    now: NOW,
  }),
  started
);

// Admin toggle on while expired → restart
const expired = new Date(NOW.getTime() - 50 * DAY_MS).toISOString();
assert.equal(
  resolveNewArrivalStartedAtFromAdminToggle({
    enabled: true,
    previousStartedAt: expired,
    now: NOW,
  }),
  NOW.toISOString()
);

// Admin toggle on from null → start
assert.equal(
  resolveNewArrivalStartedAtFromAdminToggle({
    enabled: true,
    previousStartedAt: null,
    now: NOW,
  }),
  NOW.toISOString()
);

// Unchanged unchecked vs inactive live → do not persist (omit / no-op)
assert.equal(
  shouldPersistNewArrivalAdminIntent({
    formEnabled: false,
    liveStartedAt: null,
    now: NOW,
  }),
  false
);

// Unchanged checked vs active live → do not persist
assert.equal(
  shouldPersistNewArrivalAdminIntent({
    formEnabled: true,
    liveStartedAt: started,
    now: NOW,
  }),
  false
);

// Explicit end while live is active → persist clear
assert.equal(
  shouldPersistNewArrivalAdminIntent({
    formEnabled: false,
    liveStartedAt: started,
    now: NOW,
  }),
  true
);

// Explicit start while live is inactive → persist start
assert.equal(
  shouldPersistNewArrivalAdminIntent({
    formEnabled: true,
    liveStartedAt: null,
    now: NOW,
  }),
  true
);

// Restart after expiry → persist
assert.equal(
  shouldPersistNewArrivalAdminIntent({
    formEnabled: true,
    liveStartedAt: expired,
    now: NOW,
  }),
  true
);

assert.ok(compareBouquetsByNewest('2026-08-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z') < 0);
assert.ok(compareBouquetsByNewest(null, '2026-07-01T00:00:00.000Z') > 0);
assert.equal(compareBouquetsByNewest(null, null), 0);

console.log('newArrival.test.ts: all assertions passed');
