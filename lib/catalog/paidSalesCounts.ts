/**
 * Paid units sold per catalog id — storefront display only.
 * Cached separately from catalog ISR so order volume does not bust product caches.
 */
import 'server-only';

import { unstable_cache } from 'next/cache';
import { fetchAllSupabasePages } from '@/lib/catalog/supabasePagination';
import {
  attachPublicSoldCount,
  foldLegacySalesCounts,
} from '@/lib/catalog/paidSalesCountsLogic';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export { MIN_PUBLIC_SOLD_COUNT, publicSoldCount } from '@/lib/catalog/paidSalesCountsLogic';

const PAID_SALES_REVALIDATE_SECONDS = 600;
const PAID_SALES_CACHE_TAG = 'catalog-paid-sales';

type LegacyIdRow = { id: string; legacy_sanity_id: string | null };
type PaidItemRow = { bouquet_id: string | null };

async function fetchLegacyIdMap(
  table: 'catalog_bouquets' | 'catalog_products'
): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};

  const rows = (await fetchAllSupabasePages(({ from, to }) =>
    supabase
      .from(table)
      .select('id, legacy_sanity_id')
      .not('legacy_sanity_id', 'is', null)
      .range(from, to)
  )) as LegacyIdRow[];

  const map: Record<string, string> = {};
  for (const row of rows) {
    const legacy = row.legacy_sanity_id?.trim();
    if (legacy) map[legacy] = row.id;
  }
  return map;
}

async function fetchPaidSalesCountMapUncached(): Promise<Record<string, number>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};

  try {
    const itemRows = (await fetchAllSupabasePages(({ from, to }) =>
      supabase
        .from('order_items')
        .select('bouquet_id, orders!inner(payment_status, order_status)')
        .eq('orders.payment_status', 'PAID')
        .neq('orders.order_status', 'CANCELLED')
        .not('bouquet_id', 'is', null)
        .range(from, to)
    )) as PaidItemRow[];

    const raw: Record<string, number> = {};
    for (const row of itemRows) {
      const id = row.bouquet_id?.trim();
      if (!id) continue;
      raw[id] = (raw[id] ?? 0) + 1;
    }

    const [bouquetLegacy, productLegacy] = await Promise.all([
      fetchLegacyIdMap('catalog_bouquets'),
      fetchLegacyIdMap('catalog_products'),
    ]);

    return foldLegacySalesCounts(raw, { ...bouquetLegacy, ...productLegacy });
  } catch (err) {
    console.error('[paidSalesCounts] failed to load paid sales map:', err);
    return {};
  }
}

export const getPaidSalesCountMap: () => Promise<Record<string, number>> = unstable_cache(
  fetchPaidSalesCountMapUncached,
  ['catalog-paid-sales-map'],
  {
    revalidate: PAID_SALES_REVALIDATE_SECONDS,
    tags: [PAID_SALES_CACHE_TAG],
  }
);

export async function attachSoldCounts<T extends { id: string }>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const counts = await getPaidSalesCountMap();
  return items.map((item) => attachPublicSoldCount(item, counts));
}

export async function attachSoldCount<T extends { id: string }>(item: T | null): Promise<T | null> {
  if (!item) return null;
  const [attached] = await attachSoldCounts([item]);
  return attached;
}
