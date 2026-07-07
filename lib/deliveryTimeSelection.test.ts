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

// Past date in custom mode bumps to earliest schedule
const bumped = resolveDeliverySchedule(
  { date: '2026-07-07', timeSlot: '', deliveryTimeMode: 'custom' },
  getShopTodayYmd(bangkokPastMidnight),
  bangkokPastMidnight
);
assert(bumped.date === '2026-07-08', 'past custom date bumps to shop today');
assert(bumped.deliveryTimeMode === 'window', 'bumped schedule uses window mode');

console.log('deliveryTimeSelection.test.ts: all assertions passed');
