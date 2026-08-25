/**
 * Run: npx tsx lib/admin/openDeliverySummary.test.ts
 */
import assert from 'node:assert/strict';
import { bucketOpenDeliveryRows } from '@/lib/admin/openDeliverySummary';

const today = '2026-08-25';

const summary = bucketOpenDeliveryRows(
  [
    { order_id: 'LB-OLD', delivery_date: '2026-08-24', order_status: 'ACCEPTED' },
    { order_id: 'LB-NULL', delivery_date: null, order_status: 'PREPARING' },
    { order_id: 'LB-TODAY', delivery_date: '2026-08-25', order_status: 'NEW' },
    { order_id: 'LB-TOM', delivery_date: '2026-08-26', order_status: 'ACCEPTED' },
    { order_id: 'LB-WEEK', delivery_date: '2026-08-31', order_status: 'READY_FOR_DELIVERY' },
  ],
  today,
  5
);

assert.equal(summary.total, 5);
assert.equal(summary.overdueCount, 2);
assert.equal(summary.todayCount, 1);
assert.equal(summary.upcomingCount, 2);
assert.deepEqual(summary.overdue.map((o) => o.order_id), ['LB-OLD', 'LB-NULL']);
assert.deepEqual(summary.upcoming.map((o) => o.order_id), ['LB-TOM', 'LB-WEEK']);
assert.equal(summary.countsByDate['2026-08-24'], 1);
assert.equal(summary.countsByDate['2026-08-25'], 1);
assert.equal(summary.countsByDate['2026-08-26'], 1);
assert.equal(summary.countsByDate['2026-08-31'], 1);
assert.equal(summary.countsByDate['2026-08-23'], undefined);

console.log('openDeliverySummary.test.ts: all passed');
