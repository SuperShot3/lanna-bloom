/**
 * Coverage display helpers (Feature 5).
 * Run with: npx tsx lib/delivery/coverageDisplay.test.ts
 */

import {
  buildCoveragePanelDisplay,
  fillDeliveryFeeAmountPlaceholder,
  formatCoverageCategories,
  formatCoverageTiming,
  formatMinCheckoutFeeLabel,
  formatShoppableProvinceSummary,
  isExpansionProvinceCode,
  listShoppableCoverageAreas,
  minCheckoutFeeThb,
  resolveProvinceForDestination,
} from './coverageDisplay';
import { addDaysToYmd, getBangkokYmd } from '@/lib/deliveryHours';
import { PREORDER_DEFAULT_ADVANCE_HOURS } from './deliveryConstraints';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const tenAmBangkok = new Date('2026-07-08T03:00:00.000Z'); // 10:00 +07
const afterCutoff = new Date('2026-07-08T10:00:00.000Z'); // 17:00 +07
const today = getBangkokYmd(tenAmBangkok);
const tomorrow = addDaysToYmd(today, 1);

assert(isExpansionProvinceCode('chiang-mai') === false, 'CM not expansion');
assert(isExpansionProvinceCode('chon-buri') === true, 'Pattaya market is expansion');
assert(isExpansionProvinceCode('bangkok') === true, 'unmapped treated as non-CM');

// Categories: empty → flowers-only on expansion, full on CM
assert(
  formatCoverageCategories({ province_code: 'chon-buri', available_categories: null }, 'en') ===
    'Flowers only',
  'expansion empty → flowers only'
);
assert(
  formatCoverageCategories({ province_code: 'chiang-mai', available_categories: [] }, 'en') ===
    'Flowers & gifts',
  'CM empty → flowers & gifts'
);
assert(
  formatCoverageCategories(
    { province_code: 'chon-buri', available_categories: ['flowers', 'gifts'] },
    'en'
  ) === 'Flowers, Gifts',
  'listed categories'
);
assert(
  formatCoverageCategories(
    { province_code: 'chon-buri', available_categories: ['flowers', 'toys'] },
    'th'
  ).includes('ของเล่นผ้า') === true,
  'toys alias label th'
);

// Coming soon → blocked
{
  const t = formatCoverageTiming(
    {
      province_code: 'bangkok',
      status: 'coming_soon',
      catalog_enabled: false,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    'en',
    tenAmBangkok
  );
  assert(t.orderingAllowed === false, 'coming_soon blocked');
  assert(t.timingLine === null, 'no earliest when blocked');
  assert(Boolean(t.blockedNotice), 'blocked notice present');
}

// Next-day → earliest tomorrow
{
  const t = formatCoverageTiming(
    {
      province_code: 'chon-buri',
      status: 'next_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    'en',
    tenAmBangkok
  );
  assert(t.orderingAllowed, 'next_day orderable');
  assert(t.earliestYmd === tomorrow, 'next_day earliest tomorrow');
  assert(Boolean(t.timingLine?.includes('Earliest delivery')), 'timing line en');
}

// Preorder default 48h
{
  const t = formatCoverageTiming(
    {
      province_code: 'phuket',
      status: 'preorder_only',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    'en',
    tenAmBangkok
  );
  const expectedFloor = getBangkokYmd(
    new Date(tenAmBangkok.getTime() + PREORDER_DEFAULT_ADVANCE_HOURS * 60 * 60 * 1000)
  );
  const expected = expectedFloor > tomorrow ? expectedFloor : tomorrow;
  assert(t.earliestYmd === expected, `preorder default 48h → ${expected}`);
}

// Same-day cutoff: before → today + cutoff line; after → tomorrow
{
  const before = formatCoverageTiming(
    {
      province_code: 'chiang-mai',
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: '14:00',
    },
    'en',
    tenAmBangkok
  );
  assert(before.earliestYmd === today, 'before cutoff → today');
  assert(Boolean(before.cutoffLine?.includes('14:00')), 'cutoff line shown');
  assert(Boolean(before.cutoffLine?.includes('Bangkok time')), 'bangkok time note');

  const after = formatCoverageTiming(
    {
      province_code: 'chiang-mai',
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: '14:00',
    },
    'en',
    afterCutoff
  );
  assert(after.earliestYmd === tomorrow, 'after cutoff → tomorrow');
}

// Panel: shoppable gates catalog vs partner CTA
{
  const open = buildCoveragePanelDisplay(
    {
      province_code: 'chiang-mai',
      status: 'same_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    'en',
    tenAmBangkok
  );
  assert(open.shoppable && !open.showPartnerCta, 'CM shoppable');
  assert(open.catalogHref === '/en/catalog', 'CM catalog href');

  const soon = buildCoveragePanelDisplay(
    {
      province_code: 'bangkok',
      status: 'coming_soon',
      catalog_enabled: false,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    'en',
    tenAmBangkok
  );
  assert(!soon.shoppable && soon.showPartnerCta, 'coming_soon → partner CTA');
  assert(soon.partnerApplyHref === '/en/partner/apply', 'partner apply href');
}

{
  const expansion = buildCoveragePanelDisplay(
    {
      province_code: 'chon-buri',
      status: 'next_day',
      catalog_enabled: true,
      min_advance_notice_hours: null,
      same_day_cutoff_local: null,
    },
    'en',
    tenAmBangkok
  );
  assert(expansion.catalogHref === '/en/catalog/pattaya', 'Pattaya catalog href');
  assert(expansion.categoriesLine === 'Flowers only', 'expansion categories default');
}

// Shoppable summaries: join by destination_id (Pattaya → chon-buri), not display name
{
  const pattaya = resolveProvinceForDestination('PATTAYA', [
    {
      province_code: 'chon-buri',
      province_name_en: 'Chon Buri',
      province_name_th: 'ชลบุรี',
      status: 'same_day',
      catalog_enabled: true,
      available_categories: null,
    },
  ]);
  assert(pattaya?.province_code === 'chon-buri', 'PATTAYA joins Chon Buri');
  assert(
    formatShoppableProvinceSummary(pattaya!, 'en', { minFeeThb: 250 }) ===
      'Same-Day · Flowers only · from ฿250',
    'Pattaya dynamic summary'
  );
}

{
  const lp = resolveProvinceForDestination('LAMPHUN', []);
  assert(lp?.province_code === 'lamphun', 'LAMPHUN seed fallback');
  assert(lp?.status === 'next_day', 'Lamphun seed next_day');
  assert(minCheckoutFeeThb('LAMPHUN') === 250, 'Lamphun min fee 250');
  assert(
    formatShoppableProvinceSummary(lp!, 'en', { minFeeThb: minCheckoutFeeThb('LAMPHUN') }) ===
      'Next-Day · Flowers only · from ฿250',
    'Lamphun dynamic summary'
  );
}

{
  const areas = listShoppableCoverageAreas([], 'en');
  const pat = areas.find((a) => a.destinationId === 'PATTAYA');
  const lp = areas.find((a) => a.destinationId === 'LAMPHUN');
  const cm = areas.find((a) => a.destinationId === 'CHIANG_MAI');
  const hh = areas.find((a) => a.destinationId === 'HUA_HIN');
  assert(Boolean(pat), 'list includes Pattaya');
  assert(Boolean(lp), 'list includes Lamphun');
  assert(Boolean(cm), 'list includes Chiang Mai');
  assert(Boolean(hh), 'list includes Hua Hin');
  assert(!pat!.summary.includes('Bouquet delivery only'), 'no hardcoded bouquet blurb');
  assert(pat!.summary.includes('Same-Day'), 'Pattaya status from seed');
  assert(lp!.summary.includes('Next-Day'), 'Lamphun status from seed');
  assert(lp!.summary.includes('from ฿250'), 'Lamphun min fee in summary');
  assert(cm!.summary.includes('Flowers & gifts'), 'CM categories');
}

{
  assert(minCheckoutFeeThb('CHIANG_MAI') === 250, 'Chiang Mai min fee 250');
  assert(minCheckoutFeeThb('PATTAYA') === 250, 'Pattaya min fee 250');
  assert(minCheckoutFeeThb('HUA_HIN') === 250, 'Hua Hin min fee 250');
  const cmAmount = formatMinCheckoutFeeLabel('CHIANG_MAI', 'en');
  assert(Boolean(cmAmount && cmAmount.includes('250')), 'formatted CM min includes 250');
  assert(Boolean(cmAmount && cmAmount.includes('฿')), 'formatted CM min uses baht sign');
  const cardCopy = fillDeliveryFeeAmountPlaceholder(
    'Delivery from {amount}',
    'CHIANG_MAI',
    'en'
  );
  assert(cardCopy.includes('Delivery from'), 'card copy prefix');
  assert(cardCopy.includes('250'), 'card copy amount');
  assert(!cardCopy.includes('{amount}'), 'placeholder filled');
  const thCopy = fillDeliveryFeeAmountPlaceholder(
    'ค่าจัดส่งเริ่มต้น {amount}',
    'LAMPHUN',
    'th'
  );
  assert(thCopy.includes('ค่าจัดส่งเริ่มต้น'), 'Thai card copy prefix');
  assert(thCopy.includes('250'), 'Thai card copy amount');
}

console.log('coverageDisplay.test.ts: ok');
