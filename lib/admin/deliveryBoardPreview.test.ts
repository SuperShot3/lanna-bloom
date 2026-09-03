/**
 * Run: npx tsx lib/admin/deliveryBoardPreview.test.ts
 */
import assert from 'node:assert/strict';
import { dayPartFromWindow, groupOrdersByDeliveryDate } from '@/lib/admin/deliveryBoardPreview';
import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';

function row(order_id: string, delivery_date: string | null): SupabaseOrderRow {
  return { order_id, delivery_date } as SupabaseOrderRow;
}

const groups = groupOrdersByDeliveryDate([
  row('LB-B', '2026-09-04'),
  row('LB-A', '2026-09-02'),
  row('LB-NONE', null),
  row('LB-A2', '2026-09-02'),
]);

assert.equal(groups.length, 3);
assert.equal(groups[0].date, '2026-09-02');
assert.deepEqual(
  groups[0].orders.map((o) => o.order_id),
  ['LB-A', 'LB-A2']
);
assert.equal(groups[1].date, '2026-09-04');
assert.equal(groups[2].date, '');
assert.equal(groups[2].orders[0].order_id, 'LB-NONE');

assert.equal(dayPartFromWindow('ANYTIME_9_20'), 'anytime');
assert.equal(dayPartFromWindow('MORNING_9_12'), 'morning');
assert.equal(dayPartFromWindow('09:00–20:00'), 'unknown');

console.log('deliveryBoardPreview.test.ts: all passed');
