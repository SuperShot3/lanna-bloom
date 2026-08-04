/**
 * Peak celebration pricing date logic.
 * Run with: npx tsx lib/promo/peakCelebrationPricing.test.ts
 */

import {
  applyPeakCelebrationMarkupThb,
  getActivePeakCelebrationNotice,
  getPeakCelebrationRuleForCheckout,
  getPeakCelebrationRuleForDeliveryDate,
  isDateInPeakWindow,
  isPeakCelebrationNoticeActiveForDate,
  parseDeliveryDateFromPreferredTimeSlot,
  peakCelebrationMinOrderShortfall,
  PEAK_CELEBRATION_RULES,
  qualifiesPeakCelebrationMinOrder,
  shouldApplyPeakCelebrationMarkup,
} from './peakCelebrationPricing';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const valentines = PEAK_CELEBRATION_RULES.find((r) => r.id === 'valentines')!;
const womensDay = PEAK_CELEBRATION_RULES.find((r) => r.id === 'womens-day')!;
const mothersDay = PEAK_CELEBRATION_RULES.find((r) => r.id === 'mothers-day')!;
const newYear = PEAK_CELEBRATION_RULES.find((r) => r.id === 'new-year')!;

assert(
  getPeakCelebrationRuleForDeliveryDate('2026-02-14')?.id === 'valentines',
  'Feb 14 is Valentine peak delivery'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-02-12')?.id === 'valentines',
  'Feb 12 is Valentine peak delivery'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-02-11') == null,
  'Feb 11 is not Valentine peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-02-15') == null,
  'Feb 15 is not Valentine peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-03-07')?.id === 'womens-day',
  'Mar 7 is Women Day peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-03-08')?.id === 'womens-day',
  'Mar 8 is Women Day peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-03-06') == null,
  'Mar 6 is outside Women Day spike'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-03-09') == null,
  'Mar 9 is outside Women Day spike'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-08-12')?.id === 'mothers-day',
  'Aug 12 is Mothers Day peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-08-10') == null,
  'Aug 10 is outside Mothers Day spike'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-08-13') == null,
  'Aug 13 is outside Mothers Day spike'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-12-30')?.id === 'new-year',
  'Dec 30 is New Year peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-12-31')?.id === 'new-year',
  'Dec 31 is New Year peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2026-12-29') == null,
  'Dec 29 is not New Year peak'
);
assert(
  getPeakCelebrationRuleForDeliveryDate('2027-01-01') == null,
  'Jan 1 is not New Year peak'
);

assert(valentines.startLabel === '12 February', 'Valentine start label');
assert(valentines.endLabel === '14 February', 'Valentine end label');
assert(valentines.minOrderThb === 2000, 'Valentine min order 2000');
assert(womensDay.startLabel === '7 March', 'Women Day start label');
assert(womensDay.endLabel === '8 March', 'Women Day end label');
assert(mothersDay.startLabel === '11 August', 'Mothers Day start label');
assert(mothersDay.endLabel === '12 August', 'Mothers Day end label');
assert(mothersDay.minOrderThb === 1500, 'min order 1500');
assert(newYear.startLabel === '30 December', 'New Year start label');
assert(newYear.endLabel === '31 December', 'New Year end label');

// Markup: both order + delivery in window
assert(
  shouldApplyPeakCelebrationMarkup('2026-02-14', '2026-02-14'),
  'order+delivery on Valentine → markup'
);
assert(
  shouldApplyPeakCelebrationMarkup('2026-02-12', '2026-02-14'),
  'order+delivery both in Valentine window → markup'
);
assert(
  !shouldApplyPeakCelebrationMarkup('2026-02-01', '2026-02-14'),
  'advance order for Valentine delivery → no markup'
);
assert(
  !shouldApplyPeakCelebrationMarkup('2026-02-14', '2026-02-20'),
  'order on Valentine for later delivery → no markup'
);
assert(
  shouldApplyPeakCelebrationMarkup('2026-08-11', '2026-08-12'),
  'order+delivery in Mothers Day window → markup'
);
assert(
  !shouldApplyPeakCelebrationMarkup('2026-08-01', '2026-08-12'),
  'advance Mothers Day order → no markup'
);
assert(
  getPeakCelebrationRuleForCheckout({
    orderYmd: '2026-08-12',
    deliveryDateYmd: '2026-08-12',
  })?.id === 'mothers-day',
  'checkout rule on spike'
);
assert(
  getPeakCelebrationRuleForCheckout({
    orderYmd: '2026-08-01',
    deliveryDateYmd: '2026-08-12',
  }) == null,
  'checkout rule null for advance'
);

assert(
  applyPeakCelebrationMarkupThb(1000, '2026-02-14', '2026-02-14') === 1300,
  'Valentine +30% when ordering on peak'
);
assert(
  applyPeakCelebrationMarkupThb(999, '2026-02-14', '2026-02-14') === 1299,
  'Valentine +30% rounds 999 to 1299'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-02-14', '2026-02-01') === 1000,
  'advance Valentine order unchanged'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-08-12', '2026-08-12') === 1150,
  'Mothers Day +15% on spike order day'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-08-12', '2026-08-01') === 1000,
  'advance Mothers Day order unchanged'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-06-01', '2026-06-01') === 1000,
  'Non-peak date unchanged'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-12-30', '2026-12-30') === 1200,
  'New Year +20% on spike'
);
assert(
  applyPeakCelebrationMarkupThb(1000, '2026-12-30', '2026-12-20') === 1000,
  'advance New Year order unchanged'
);

// Min order: items + delivery when delivery in peak window
assert(
  qualifiesPeakCelebrationMinOrder(1900, 100, '2026-02-14'),
  '1900+100 qualifies for Valentine min 2000'
);
assert(
  !qualifiesPeakCelebrationMinOrder(1900, 99, '2026-02-14'),
  '1900+99 below Valentine min 2000'
);
assert(
  peakCelebrationMinOrderShortfall(1000, 100, '2026-02-14') === 900,
  'Valentine shortfall is 900 toward 2000'
);
assert(
  peakCelebrationMinOrderShortfall(1500, 0, '2026-08-12') === 0,
  '1500 items + 0 delivery meets Mothers Day min'
);
assert(
  peakCelebrationMinOrderShortfall(1400, 100, '2026-03-07') === 0,
  '1400+100 meets Women Day min 1500'
);
assert(
  peakCelebrationMinOrderShortfall(1000, 100, '2026-06-01') === 0,
  'no min outside peak delivery'
);

assert(
  parseDeliveryDateFromPreferredTimeSlot('2026-02-14 09:00–12:00') === '2026-02-14',
  'parses delivery date from preferredTimeSlot'
);

assert(
  isPeakCelebrationNoticeActiveForDate('2026-02-05', valentines),
  'Feb 5 is exactly 7 days before Valentine start (12 Feb)'
);
assert(
  isPeakCelebrationNoticeActiveForDate('2026-02-11', valentines),
  'Feb 11 is day before Valentine start'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-02-12', valentines),
  'Feb 12 (start day) is not notice window'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-02-04', valentines),
  'Feb 4 is before notice window'
);

assert(
  isPeakCelebrationNoticeActiveForDate('2026-08-04', mothersDay),
  'Aug 4 is 7 days before Mothers Day start (11 Aug)'
);
assert(
  isPeakCelebrationNoticeActiveForDate('2026-08-10', mothersDay),
  'Aug 10 is day before Mothers Day start'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-08-11', mothersDay),
  'Aug 11 is peak start, not notice'
);

assert(
  isPeakCelebrationNoticeActiveForDate('2026-12-23', newYear),
  'Dec 23 is 7 days before New Year peak start (30 Dec)'
);
assert(
  isPeakCelebrationNoticeActiveForDate('2026-12-29', newYear),
  'Dec 29 is day before New Year start'
);
assert(
  !isPeakCelebrationNoticeActiveForDate('2026-12-30', newYear),
  'Dec 30 is peak start, not notice'
);

assert(
  getActivePeakCelebrationNotice(new Date('2026-02-08T12:00:00+07:00'))?.id === 'valentines',
  'active notice on Feb 8 Bangkok'
);
assert(
  getActivePeakCelebrationNotice(new Date('2026-02-14T12:00:00+07:00')) == null,
  'no notice on Valentine peak day'
);

assert(
  isDateInPeakWindow('2026-02-14', valentines.window),
  'Feb 14 in Valentine window'
);
assert(
  !isDateInPeakWindow('2026-02-15', valentines.window),
  'Feb 15 outside Valentine window'
);

console.log('peakCelebrationPricing.test.ts: all assertions passed');
