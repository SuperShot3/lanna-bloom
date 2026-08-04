/**
 * Catalog-backed cart line delivery options merge.
 * Run with: npx tsx lib/delivery/mergeCartLineDeliveryOptions.test.ts
 */

import { computeDeliveryConstraint } from './deliveryConstraints';
import {
  bouquetIdsForDeliveryOptionsLookup,
  mergeCartLinesWithCatalogOptions,
} from './mergeCartLineDeliveryOptions';
import { addDaysToYmd, getBangkokYmd } from '@/lib/deliveryHours';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const tenAmBangkok = new Date('2026-07-08T03:00:00.000Z'); // 10:00 +07
const today = getBangkokYmd(tenAmBangkok);
const tomorrow = addDaysToYmd(today, 1);

const chiangMai = {
  status: 'same_day' as const,
  catalog_enabled: true,
  min_advance_notice_hours: null,
  same_day_cutoff_local: null,
};

// Lookup ids
{
  const ids = bouquetIdsForDeliveryOptionsLookup([
    { itemType: 'bouquet', bouquetId: 'b1', deliveryOptions: ['same_day'] },
    { itemType: 'product', bouquetId: 'p1' },
    { itemType: 'bouquet', bouquetId: '  b2  ' },
    { itemType: 'bouquet' },
  ]);
  assert(ids.includes('b1') && ids.includes('b2'), 'bouquet ids collected');
  assert(!ids.includes('p1'), 'non-bouquet ids skipped');
}

// Catalog next_day wins over missing localStorage options
{
  const merged = mergeCartLinesWithCatalogOptions(
    [{ itemType: 'bouquet', bouquetId: 'b-next', deliveryOptions: undefined }],
    { 'b-next': ['next_day'] }
  );
  assert(
    JSON.stringify(merged[0]?.deliveryOptions) === JSON.stringify(['next_day']),
    'catalog options applied'
  );

  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: merged,
    now: tenAmBangkok,
  });
  assert(c.earliestYmd === tomorrow, 'catalog next_day floors tomorrow');
  assert(c.reasonCode === 'product_next_day', 'reason product_next_day');
}

// Catalog wins over stale same_day localStorage
{
  const merged = mergeCartLinesWithCatalogOptions(
    [{ itemType: 'bouquet', bouquetId: 'b1', deliveryOptions: ['same_day'] }],
    { b1: ['next_day'] }
  );
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: merged,
    now: tenAmBangkok,
  });
  assert(c.earliestYmd === tomorrow, 'catalog overrides stale same_day');
}

// Local next_day kept when catalog map has no entry for id
{
  const merged = mergeCartLinesWithCatalogOptions(
    [{ itemType: 'bouquet', bouquetId: 'b-local', deliveryOptions: ['next_day'] }],
    { 'other-id': ['same_day'] }
  );
  assert(
    JSON.stringify(merged[0]?.deliveryOptions) === JSON.stringify(['next_day']),
    'local next_day kept when catalog id missing'
  );
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: merged,
    now: tenAmBangkok,
  });
  assert(c.earliestYmd === tomorrow, 'local next_day still floors');
}

// Missing catalog entry keeps localStorage
{
  const merged = mergeCartLinesWithCatalogOptions(
    [{ itemType: 'bouquet', bouquetId: 'b1', deliveryOptions: ['next_day'] }],
    {}
  );
  assert(
    JSON.stringify(merged[0]?.deliveryOptions) === JSON.stringify(['next_day']),
    'local kept when catalog empty map'
  );
}

// Null catalog keeps local
{
  const merged = mergeCartLinesWithCatalogOptions(
    [{ itemType: 'bouquet', bouquetId: 'b1', deliveryOptions: ['next_day'] }],
    null
  );
  assert(
    JSON.stringify(merged[0]?.deliveryOptions) === JSON.stringify(['next_day']),
    'local kept when catalog null'
  );
}

// Empty catalog array (legacy same-day capable) wins when key present
{
  const merged = mergeCartLinesWithCatalogOptions(
    [{ itemType: 'bouquet', bouquetId: 'b1', deliveryOptions: ['next_day'] }],
    { b1: [] }
  );
  const c = computeDeliveryConstraint({
    province: chiangMai,
    cartLines: merged,
    now: tenAmBangkok,
  });
  assert(c.earliestYmd === today, 'empty catalog options = same-day capable');
  assert(c.reasonCode === 'ok', 'reason ok for empty options');
}

console.log('mergeCartLineDeliveryOptions.test.ts: all passed');
