/**
 * Peak celebration pricing date logic.
 * Run with: npx tsx lib/promo/peakCelebrationPricing.test.ts
 */

import {
  applyPeakCelebrationMarkupThb,
  getActivePeakCelebrationNotice,
  getPeakCelebrationRuleForDeliveryDate,
  isDateInPeakWindow,
  isPeakCelebrationNoticeActiveForDate,
  parseDeliveryDateFromPreferredTimeSlot,
  peakCelebrationMinOrderShortfall,
  PEAK_CELEBRATION_RULES,
  qualifiesPeakCelebrationMinOrder,
} from './peakCelebrationPricing';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const valentines = PEAK_CELEBRATION_RULES.find((r) => r.id === 'valentines')!;
const newYear = PEAK_CELEBRATION_RULES.find((r) => r.id === 'new-year')!;

assert(
  getPeakCelebrationRuleForDeliveryDate('2026-02-14')?.id === 'valentines',
  'Feb 14 is Valentine peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-02-09') == null,
  'Feb 9 is not Valentine peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-03-07')?.id === 'womens-day',
  'Mar 7 is Women Day peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-08-12')?.id === 'mothers-day',
  'Aug 12 is Mothers Day peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-12-30')?.id === 'new-year',
  'Dec 30 is New Year peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2027-01-01')?.id === 'new-year',
  'Jan 1 is New Year peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2027-01-03') == null,
  'Jan 3 is not New Year peak'
);

assert(
  applyPeakCelebrationMarkupThb(1000, '2026-02-14') === 1300,
  'Valentine +30% rounds to 1300'
);
assert(
  applyPeakCelebrationMarkupThb(999, '2026-02-14') === 1299,
  'Valentine +30% rounds 999 to 1299'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-06-01') === 1000,
  'Non-peak date unchanged'
);

assert(
  qualifiesPeakCelebrationMinOrder(2000, '2026-02-14'),
  '2000 qualifies for Valentine min'
);
assert(
  !qualifiesPeakCelebrationMinOrder(1999, '2026-02-14'),
  '1999 below Valentine min'
);
assert(
  peakCelebrationMinOrderShortfall(1500, '2026-02-14') === 500,
  'shortfall is 500'
);

assert(
  parseDeliveryDateFromPreferredTimeSlot('2026-02-14 09:00–12:00') === '2026-02-14',
  'parses delivery date from preferredTimeSlot'
);

assert(
  isPeakCelebrationNoticeActiveForDate('2026-02-03', valentines),
  'Feb 3 is exactly 7 days before Valentine start'
);
assert(
  isPeakCelebrationNoticeActiveForDate('2026-02-09', valentines),
  'Feb 9 is day before Valentine start'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-02-10', valentines),
  'Feb 10 (start day) is not notice window'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-02-02', valentines),
  'Feb 2 is before notice window'
);

assert(
  isPeakCelebrationNoticeActiveForDate('2026-12-22', newYear),
  'Dec 22 is 7 days before New Year peak start'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-12-29', newYear),
  'Dec 29 is peak start, not notice'
);

assert(
  getActivePeakCelebrationNotice(new Date('2026-02-05T12:00:00+07:00'))?.id === 'valentines',
  'active notice on Feb 5 Bangkok'
);
assert(
  getActivePeakCelebrationNotice(new Date('2026-02-14T12:00:00+07:00')) == null,
  'no notice on Valentine start day'
);

assert(
  isDateInPeakWindow('2026-02-15', valentines.window),
  'Feb 15 in Valentine window'
);
assert(
  !isDateInPeakWindow('2026-02-16', valentines.window),
  'Feb 16 outside Valentine window'
);

console.log('peakCelebrationPricing.test.ts: all assertions passed');
