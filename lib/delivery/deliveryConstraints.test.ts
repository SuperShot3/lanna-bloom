/**
 * Delivery schedule validation (Chiang Mai timezone) + optional province/product constraint.
 * Run with: npx tsx lib/delivery/deliveryConstraints.test.ts
 */

import {
  computeDeliveryConstraint,
  earliestYmdFromAdvanceHours,
  PREORDER_DEFAULT_ADVANCE_HOURS,
  productEarliestYmdFromCartLines,
  type ProvinceConstraintInput,
} from './deliveryConstraints';
import { addDaysToYmd, getBangkokYmd } from '@/lib/deliveryHours';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const tenAmBangkok = new Date('2026-07-08T03:00:00.000Z'); // 10:00 +07
const today = getBangkokYmd(tenAmBangkok);
const tomorrow = addDaysToYmd(today, 1);
assert(today === '2026-07-08', 'fixture today');

const chiangMai: NonNullable<ProvinceConstraintInput> = {
  status: 'same_day',
  catalog_enabled: true,
  min_advance_notice_hours: null,
  same_day_cutoff_local: null,
};

// Chiang Mai passthrough: same as shop-hours (today allowed)
{
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: [{ itemType: 'bouquet' }],
    now: tenAmBangkok,
  });
  assert(c.orderingAllowed, 'CM ordering allowed');
  assert(c.earliestYmd === today, 'CM earliest is today');
  assert(c.reasonCode === 'ok', 'CM reason ok');
}

// No province row → shop-hours only
{
  const c = computeDeliveryConstraint({
    province: null,
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['same_day'] }],
    now: tenAmBangkok,
  });
  assert(c.orderingAllowed && c.earliestYmd === today, 'null province falls back to today');
}

// Product same-day + province next-day → next-day
{
  const c = computeDeliveryConstraint({
    province: {
      status: 'next_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['same_day', 'next_day'] }],
    now: tenAmBangkok,
  });
  assert(c.orderingAllowed, 'next_day province allows ordering');
  assert(c.earliestYmd === tomorrow, 'next_day province floors at tomorrow');
  assert(c.reasonCode === 'next_day', 'reason next_day');
}

// Product next-day-only wins over same_day province (Chiang Mai)
{
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: [
      { itemType: 'bouquet', deliveryOptions: ['same_day'] },
      { itemType: 'bouquet', deliveryOptions: ['next_day'] },
    ],
    now: tenAmBangkok,
  });
  assert(c.earliestYmd === tomorrow, 'cart next_day-only product wins');
  assert(c.reasonCode === 'product_next_day', 'product_next_day reason');
}

// Legacy empty options = same-day capable
{
  const floor = productEarliestYmdFromCartLines(
    [{ itemType: 'bouquet' }, { itemType: 'product' }],
    today
  );
  assert(floor.earliestYmd === null, 'legacy/empty allows same-day');
}

// Coming soon / unavailable / catalog off
for (const [status, code] of [
  ['coming_soon', 'coming_soon'],
  ['temporarily_unavailable', 'temporarily_unavailable'],
] as const) {
  const c = computeDeliveryConstraint({
    province: {
      status,
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    now: tenAmBangkok,
  });
  assert(!c.orderingAllowed && c.reasonCode === code, `${status} blocks`);
}

{
  const c = computeDeliveryConstraint({
    province: {
      status: 'same_day',
      catalog_enabled: false,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    now: tenAmBangkok,
  });
  assert(!c.orderingAllowed && c.reasonCode === 'catalog_disabled', 'catalog_disabled blocks');
}

// Preorder default 48h
{
  const c = computeDeliveryConstraint({
    province: {
      status: 'preorder_only',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    now: tenAmBangkok,
  });
  const expected = earliestYmdFromAdvanceHours(tenAmBangkok, PREORDER_DEFAULT_ADVANCE_HOURS);
  assert(c.orderingAllowed, 'preorder allows ordering');
  assert(c.earliestYmd === expected, `preorder default 48h → ${expected}`);
  assert(c.earliestYmd! >= tomorrow, 'preorder never today');
  assert(c.reasonCode === 'preorder', 'preorder reason');
}

// Province 48h advance on same_day status (product “requires 48h” via province hours)
{
  const c = computeDeliveryConstraint({
    province: {
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: 48,
      same_day_cutoff_local: null,
    },
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['same_day'] }],
    now: tenAmBangkok,
  });
  const expected = earliestYmdFromAdvanceHours(tenAmBangkok, 48);
  assert(c.earliestYmd === expected, '48h province advance floors date');
}

// Same-day cutoff: after cutoff → tomorrow
{
  const afterCutoff = new Date('2026-07-08T08:00:00.000Z'); // 15:00 +07
  const c = computeDeliveryConstraint({
    province: {
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: '14:00',
    },
    now: afterCutoff,
  });
  assert(c.earliestYmd === '2026-07-09', 'after cutoff floors tomorrow');
  assert(c.reasonCode === 'same_day_cutoff', 'same_day_cutoff reason');
}

// Same-day cutoff: before cutoff → today still ok
{
  const beforeCutoff = new Date('2026-07-08T05:00:00.000Z'); // 12:00 +07
  const c = computeDeliveryConstraint({
    province: {
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: '14:00',
    },
    now: beforeCutoff,
  });
  assert(c.earliestYmd === '2026-07-08', 'before cutoff keeps today');
}

console.log('deliveryConstraints.test.ts: all assertions passed');
