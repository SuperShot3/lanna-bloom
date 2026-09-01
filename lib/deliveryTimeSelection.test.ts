/**
 * Delivery schedule validation (Chiang Mai timezone).
 * Run with: npx tsx lib/deliveryTimeSelection.test.ts
 */

import {
  isDeliveryDateSelectable,
  isDeliveryTimeSlotSelectableForDate,
  isPreferredTimeSlotValid,
  resolveDeliverySchedule,
} from './deliveryTimeSelection';
import type { DeliveryConstraint } from './delivery/deliveryConstraints';
import { getBangkokYmd, getShopTodayYmd } from './deliveryHours';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// Midnight boundary: 1 AM July 8 Bangkok (still July 7 evening in UK)
const bangkokPastMidnight = new Date('2026-07-07T18:00:00.000Z');
assert(getBangkokYmd(bangkokPastMidnight) === '2026-07-08', 'fixture is July 8 in Bangkok');
assert(
  getShopTodayYmd(bangkokPastMidnight) === '2026-07-08',
  'shop today matches Bangkok at boundary'
);
assert(
  !isDeliveryDateSelectable('2026-07-07', bangkokPastMidnight),
  'yesterday is rejected when Bangkok has rolled forward'
);
assert(
  isDeliveryDateSelectable('2026-07-08', bangkokPastMidnight),
  'Bangkok today remains selectable'
);
assert(
  !isDeliveryTimeSlotSelectableForDate(
    '2026-07-07',
    '09:00–12:00',
    bangkokPastMidnight
  ),
  'past date window slot rejected at boundary'
);
assert(
  !isPreferredTimeSlotValid('2026-07-07 09:00–12:00', bangkokPastMidnight),
  'preferredTimeSlot with past date rejected server-side'
);

// Custom time lead time on same day
const tenAmBangkok = new Date('2026-07-08T03:00:00.000Z'); // 10:00 +07
assert(
  !isDeliveryTimeSlotSelectableForDate('2026-07-08', '10:30', tenAmBangkok),
  'custom time under 1 h lead rejected'
);
assert(
  isDeliveryTimeSlotSelectableForDate('2026-07-08', '11:00', tenAmBangkok),
  'custom time at 1 h lead accepted'
);

// Custom mode preserves empty time until user picks
const customPending = resolveDeliverySchedule(
  { date: '2026-07-10', timeSlot: '', deliveryTimeMode: 'custom' },
  getShopTodayYmd(bangkokPastMidnight),
  bangkokPastMidnight
);
assert(
  customPending.date === '2026-07-10' &&
    customPending.timeSlot === '' &&
    customPending.deliveryTimeMode === 'custom',
  'custom mode does not auto-fill morning when time is empty'
);

// Custom mode keeps invalid HH:mm so the UI can explain (before open / too soon)
const customBeforeOpen = resolveDeliverySchedule(
  { date: '2026-07-10', timeSlot: '07:00', deliveryTimeMode: 'custom' },
  getShopTodayYmd(bangkokPastMidnight),
  bangkokPastMidnight
);
assert(
  customBeforeOpen.date === '2026-07-10' &&
    customBeforeOpen.timeSlot === '07:00' &&
    customBeforeOpen.deliveryTimeMode === 'custom',
  'custom mode preserves before-open specific time for UI feedback'
);
assert(
  !isDeliveryTimeSlotSelectableForDate('2026-07-10', '07:00', bangkokPastMidnight),
  'before-open time remains non-selectable for checkout'
);

const customTooSoon = resolveDeliverySchedule(
  { date: '2026-07-08', timeSlot: '10:30', deliveryTimeMode: 'custom' },
  getShopTodayYmd(tenAmBangkok),
  tenAmBangkok
);
assert(
  customTooSoon.date === '2026-07-08' &&
    customTooSoon.timeSlot === '10:30' &&
    customTooSoon.deliveryTimeMode === 'custom',
  'custom mode preserves too-soon specific time for UI feedback'
);

const customAfterHours = resolveDeliverySchedule(
  { date: '2026-07-10', timeSlot: '20:00', deliveryTimeMode: 'custom' },
  getShopTodayYmd(bangkokPastMidnight),
  bangkokPastMidnight
);
assert(
  customAfterHours.date === '2026-07-10' &&
    customAfterHours.timeSlot === '20:00' &&
    customAfterHours.deliveryTimeMode === 'custom',
  'custom mode preserves after-hours specific time for UI feedback'
);

// Past date in custom mode bumps to earliest schedule
const bumped = resolveDeliverySchedule(
  { date: '2026-07-07', timeSlot: '', deliveryTimeMode: 'custom' },
  getShopTodayYmd(bangkokPastMidnight),
  bangkokPastMidnight
);
assert(bumped.date === '2026-07-08', 'past custom date bumps to shop today');
assert(bumped.deliveryTimeMode === 'window', 'bumped schedule uses window mode');

// Past date with invalid custom time still bumps (date not selectable)
const bumpedWithTime = resolveDeliverySchedule(
  { date: '2026-07-07', timeSlot: '08:00', deliveryTimeMode: 'custom' },
  getShopTodayYmd(bangkokPastMidnight),
  bangkokPastMidnight
);
assert(bumpedWithTime.date === '2026-07-08', 'past custom date with time bumps to shop today');
assert(bumpedWithTime.deliveryTimeMode === 'window', 'bumped invalid custom uses window mode');

// Optional province constraint: next-day floor rejects today
const nextDayConstraint: DeliveryConstraint = {
  orderingAllowed: true,
  earliestYmd: '2026-07-09',
  sameDayCutoffLocal: null,
  reasonCode: 'next_day',
  customerMessageEn: null,
  customerMessageTh: null,
  deliveryLimitationsEn: null,
  deliveryLimitationsTh: null,
};
assert(
  !isDeliveryDateSelectable('2026-07-08', bangkokPastMidnight, nextDayConstraint),
  'constraint rejects today when earliest is tomorrow'
);
assert(
  isDeliveryDateSelectable('2026-07-09', bangkokPastMidnight, nextDayConstraint),
  'constraint allows earliest date'
);
assert(
  !isPreferredTimeSlotValid('2026-07-08 15:00–18:00', bangkokPastMidnight, nextDayConstraint),
  'preferredTimeSlot today rejected under next-day constraint'
);
const blocked: DeliveryConstraint = {
  ...nextDayConstraint,
  orderingAllowed: false,
  earliestYmd: null,
  reasonCode: 'coming_soon',
};
assert(
  !isPreferredTimeSlotValid('2026-07-10 09:00–12:00', bangkokPastMidnight, blocked),
  'coming_soon blocks all slots'
);

console.log('deliveryTimeSelection.test.ts: all assertions passed');
