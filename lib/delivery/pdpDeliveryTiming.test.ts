/**
 * PDP earliest-delivery display helpers.
 * Run with: npx tsx lib/delivery/pdpDeliveryTiming.test.ts
 */

import {
  computeDeliveryConstraint,
  type ProvinceConstraintInput,
} from './deliveryConstraints';
import { formatPdpDeliveryTiming } from './pdpDeliveryTiming';
import { addDaysToYmd, getBangkokYmd } from '@/lib/deliveryHours';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const tenAmBangkok = new Date('2026-07-08T03:00:00.000Z'); // 10:00 +07
const afterCutoff = new Date('2026-07-08T10:00:00.000Z'); // 17:00 +07
const today = getBangkokYmd(tenAmBangkok);
const tomorrow = addDaysToYmd(today, 1);
assert(today === '2026-07-08', 'fixture today');

const chiangMai: NonNullable<ProvinceConstraintInput> = {
  status: 'same_day',
  catalog_enabled: true,
  min_advance_notice_hours: null,
  same_day_cutoff_local: null,
};

// Chiang Mai same-day before cutoff → today
{
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['same_day'] }],
    now: tenAmBangkok,
  });
  const d = formatPdpDeliveryTiming(c, 'en');
  assert(d.orderingAllowed, 'CM same-day allows ordering');
  assert(d.earliestYmd === today, 'CM earliest is today');
  assert(
    d.timingLine === 'Earliest delivery: 8 Jul 2026',
    `CM timing line: ${d.timingLine}`
  );
  assert(d.noticeLine == null || d.noticeLine === '', 'no next-day notice when ok');
}

// Product next_day only → tomorrow + notice
{
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['next_day'] }],
    now: tenAmBangkok,
  });
  const d = formatPdpDeliveryTiming(c, 'en');
  assert(d.orderingAllowed, 'product next_day allows ordering');
  assert(d.earliestYmd === tomorrow, 'product next_day earliest tomorrow');
  assert(
    d.timingLine === 'Earliest delivery: 9 Jul 2026',
    `product next_day timing: ${d.timingLine}`
  );
  assert(
    (d.noticeLine ?? '').includes('at least one day'),
    `product next_day notice: ${d.noticeLine}`
  );
}

// Province next_day + product same-day → tomorrow
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
  const d = formatPdpDeliveryTiming(c, 'en');
  assert(d.orderingAllowed, 'province next_day allows ordering');
  assert(d.earliestYmd === tomorrow, 'province next_day floors tomorrow');
  assert(
    d.timingLine === 'Earliest delivery: 9 Jul 2026',
    `province next_day timing: ${d.timingLine}`
  );
  assert(
    (d.noticeLine ?? '').includes('at least one day'),
    `province next_day notice: ${d.noticeLine}`
  );
}

// After same-day cutoff → tomorrow + cutoff reason
{
  const c = computeDeliveryConstraint({
    province: {
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: '14:00',
    },
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['same_day'] }],
    now: afterCutoff,
  });
  const d = formatPdpDeliveryTiming(c, 'en');
  assert(d.orderingAllowed, 'after cutoff still allows ordering');
  assert(d.earliestYmd === tomorrow, 'after cutoff earliest tomorrow');
  assert(
    (d.noticeLine ?? '').toLowerCase().includes('same-day'),
    `cutoff notice: ${d.noticeLine}`
  );
  assert(
    (d.cutoffLine ?? '').includes('14:00'),
    `cutoff line: ${d.cutoffLine}`
  );
}

// Coming soon → blocked notice, no timing
{
  const c = computeDeliveryConstraint({
    province: {
      status: 'coming_soon',
      catalog_enabled: false,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['same_day'] }],
    now: tenAmBangkok,
  });
  const d = formatPdpDeliveryTiming(c, 'th');
  assert(!d.orderingAllowed, 'coming soon blocks ordering');
  assert(d.timingLine == null, 'no timing when blocked');
  assert(d.earliestYmd == null, 'no earliest when blocked');
  assert(Boolean(d.noticeLine), 'blocked has notice');
}

// Thai earliest copy
{
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: [{ itemType: 'bouquet', deliveryOptions: ['next_day'] }],
    now: tenAmBangkok,
  });
  const d = formatPdpDeliveryTiming(c, 'th');
  assert(
    (d.timingLine ?? '').startsWith('จัดส่งเร็วสุด:'),
    `th timing: ${d.timingLine}`
  );
}

console.log('pdpDeliveryTiming.test.ts: all passed');
