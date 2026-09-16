import 'server-only';

import { fetchAllSupabasePages } from '@/lib/catalog/supabasePagination';
import { indexImageUrl } from '@/lib/catalogAdmin';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  SoldProductEntityType,
  SoldProductHistoryGroup,
  SoldProductHistorySaleRow,
  SoldProductsHistoryResponse,
} from '@/lib/admin/soldProductsHistoryTypes';

type NestedOrder = {
  paid_at?: string | null;
  created_at?: string | null;
};

type SoldOrderItemRow = {
  order_id?: string | null;
  bouquet_id?: string | null;
  bouquet_title?: string | null;
  item_type?: string | null;
  price?: number | string | null;
  image_url_snapshot?: string | null;
  source_shop_id?: string | null;
  source_shop_name?: string | null;
  orders?: NestedOrder | NestedOrder[] | null;
};

type CatalogEntityRow = {
  id: string;
  name_en: string | null;
  images: CatalogStoredImage[] | null;
  sold_history_notes: string | null;
  sold_history_images: CatalogStoredImage[] | null;
};

function asOrder(value: NestedOrder | NestedOrder[] | null | undefined): NestedOrder | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t === '' ? null : t;
}

function parsePrice(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function normalizeEntityType(itemType: string | null | undefined): SoldProductEntityType {
  return itemType === 'product' ? 'product' : 'bouquet';
}

function paidAtMs(paidAt: string | null): number {
  if (!paidAt) return 0;
  const ms = Date.parse(paidAt);
  return Number.isFinite(ms) ? ms : 0;
}

export async function fetchSoldProductsHistory(): Promise<
  { ok: true; data: SoldProductsHistoryResponse } | { ok: false; error: string; status: number }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  let rawRows: unknown[];
  try {
    rawRows = await fetchAllSupabasePages((page) =>
      supabase
        .from('order_items')
        .select(
          'order_id, bouquet_id, bouquet_title, item_type, price, image_url_snapshot, source_shop_id, source_shop_name, orders!inner(paid_at, created_at, payment_status, order_status)'
        )
        .eq('orders.payment_status', 'PAID')
        .neq('orders.order_status', 'CANCELLED')
        .range(page.from, page.to)
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Query failed', status: 500 };
  }

  type GroupKey = string;
  type SaleRowWithTitle = SoldProductHistorySaleRow & { title: string | null };
  const buckets = new Map<
    GroupKey,
    { entityType: SoldProductEntityType; productId: string; history: SaleRowWithTitle[] }
  >();

  for (const raw of (rawRows as SoldOrderItemRow[])) {
    const productId = trimOrNull(raw.bouquet_id);
    const orderId = trimOrNull(raw.order_id);
    if (!productId || !orderId) continue;

    const entityType = normalizeEntityType(raw.item_type);
    const key: GroupKey = `${entityType}:${productId}`;
    const order = asOrder(raw.orders);
    const paidAt = trimOrNull(order?.paid_at) ?? trimOrNull(order?.created_at);

    const saleRow: SaleRowWithTitle = {
      order_id: orderId,
      paid_at: paidAt,
      price: parsePrice(raw.price),
      shop_id: trimOrNull(raw.source_shop_id),
      shop_name: trimOrNull(raw.source_shop_name),
      image_snapshot: trimOrNull(raw.image_url_snapshot),
      title: trimOrNull(raw.bouquet_title),
    };

    const existing = buckets.get(key);
    if (existing) {
      existing.history.push(saleRow);
    } else {
      buckets.set(key, { entityType, productId, history: [saleRow] });
    }
  }

  const bouquetIds = Array.from(buckets.values())
    .filter((b) => b.entityType === 'bouquet')
    .map((b) => b.productId);
  const productIds = Array.from(buckets.values())
    .filter((b) => b.entityType === 'product')
    .map((b) => b.productId);

  const [bouquetRowsResult, productRowsResult] = await Promise.all([
    bouquetIds.length
      ? supabase
          .from('catalog_bouquets')
          .select('id, name_en, images, sold_history_notes, sold_history_images')
          .in('id', bouquetIds)
      : Promise.resolve({ data: [] as CatalogEntityRow[], error: null }),
    productIds.length
      ? supabase
          .from('catalog_products')
          .select('id, name_en, images, sold_history_notes, sold_history_images')
          .in('id', productIds)
      : Promise.resolve({ data: [] as CatalogEntityRow[], error: null }),
  ]);

  if (bouquetRowsResult.error) {
    return { ok: false, error: bouquetRowsResult.error.message, status: 500 };
  }
  if (productRowsResult.error) {
    return { ok: false, error: productRowsResult.error.message, status: 500 };
  }

  const catalogById = new Map<string, CatalogEntityRow>();
  for (const row of (bouquetRowsResult.data ?? []) as CatalogEntityRow[]) {
    catalogById.set(`bouquet:${row.id}`, row);
  }
  for (const row of (productRowsResult.data ?? []) as CatalogEntityRow[]) {
    catalogById.set(`product:${row.id}`, row);
  }

  const groups: SoldProductHistoryGroup[] = [];
  for (const [key, bucket] of Array.from(buckets.entries())) {
    const catalogRow = catalogById.get(key);
    const sortedHistory = [...bucket.history].sort((a, b) => paidAtMs(b.paid_at) - paidAtMs(a.paid_at));
    const last = sortedHistory[0];
    const fallbackTitle = sortedHistory.find((row) => row.title)?.title ?? null;
    const history: SoldProductHistorySaleRow[] = sortedHistory.map(({ title: _title, ...row }) => row);

    groups.push({
      entity_type: bucket.entityType,
      product_id: bucket.productId,
      is_orphaned: !catalogRow,
      name: catalogRow?.name_en?.trim() || fallbackTitle || bucket.productId,
      thumbnail_url: catalogRow ? indexImageUrl(supabase, catalogRow.images ?? []) ?? null : null,
      times_sold: history.length,
      last_sold_at: last?.paid_at ?? null,
      last_sold_price: last?.price ?? null,
      sold_history_notes: catalogRow?.sold_history_notes ?? null,
      sold_history_images: (catalogRow?.sold_history_images ?? []) as CatalogStoredImage[],
      history,
    });
  }

  groups.sort((a, b) => paidAtMs(b.last_sold_at) - paidAtMs(a.last_sold_at));

  return { ok: true, data: { groups } };
}
