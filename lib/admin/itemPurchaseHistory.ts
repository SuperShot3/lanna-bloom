import 'server-only';

import {
  createOrderItemPhotoSignedUrl,
  ORDER_ITEM_PHOTO_PREFIX,
} from '@/lib/admin/itemPurchasePhoto';
import type {
  ItemPurchaseHistoryResponse,
  ItemPurchaseHistoryRow,
  ItemPurchaseHistorySummary,
} from '@/lib/admin/itemPurchaseHistoryTypes';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const HISTORY_FETCH_LIMIT = 60;
const HISTORY_RETURN_LIMIT = 20;

type NestedOrder = {
  paid_at?: string | null;
  created_at?: string | null;
  payment_status?: string | null;
  order_status?: string | null;
  confirmed_shop_id?: string | null;
  confirmed_supplier_shop_name?: string | null;
};

type HistoryQueryRow = {
  order_id?: string | null;
  size?: string | null;
  cost?: number | string | null;
  source_shop_id?: string | null;
  source_shop_name?: string | null;
  purchase_photo_path?: string | null;
  orders?: NestedOrder | NestedOrder[] | null;
};

function asOrder(value: NestedOrder | NestedOrder[] | null | undefined): NestedOrder | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseCost(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t === '' ? null : t;
}

function resolveShop(row: HistoryQueryRow, order: NestedOrder | null): {
  shop_id: string | null;
  shop_name: string | null;
} {
  const itemId = trimOrNull(row.source_shop_id);
  const itemName = trimOrNull(row.source_shop_name);
  if (itemId || itemName) {
    return { shop_id: itemId, shop_name: itemName ?? itemId };
  }
  return {
    shop_id: trimOrNull(order?.confirmed_shop_id),
    shop_name: trimOrNull(order?.confirmed_supplier_shop_name),
  };
}

function emptySummary(): ItemPurchaseHistorySummary {
  return {
    last_cost: null,
    last_shop_id: null,
    last_shop_name: null,
    average: null,
    min: null,
    max: null,
    count: 0,
  };
}

function summarize(rows: ItemPurchaseHistoryRow[]): ItemPurchaseHistorySummary {
  if (rows.length === 0) return emptySummary();
  const costs = rows.map((r) => r.cost);
  const sum = costs.reduce((s, n) => s + n, 0);
  const first = rows[0];
  return {
    last_cost: first.cost,
    last_shop_id: first.shop_id,
    last_shop_name: first.shop_name,
    average: Math.round((sum / costs.length) * 100) / 100,
    min: Math.min(...costs),
    max: Math.max(...costs),
    count: rows.length,
  };
}

function paidAtMs(paidAt: string | null): number {
  if (!paidAt) return 0;
  const ms = Date.parse(paidAt);
  return Number.isFinite(ms) ? ms : 0;
}

function isOpsPhotoPath(path: string): boolean {
  return path.startsWith(`${ORDER_ITEM_PHOTO_PREFIX}/`);
}

async function signedPhotoUrlsByPath(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p) => isOpsPhotoPath(p)))];
  const entries = await Promise.all(
    unique.map(async (path) => {
      const signed = await createOrderItemPhotoSignedUrl(path);
      return signed.ok ? ([path, signed.signedUrl] as const) : null;
    })
  );
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (entry) map.set(entry[0], entry[1]);
  }
  return map;
}

export async function fetchItemPurchaseHistory(params: {
  bouquetId: string;
  size?: string | null;
  currentOrderId?: string | null;
}): Promise<{ ok: true; data: ItemPurchaseHistoryResponse } | { ok: false; error: string; status: number }> {
  const bouquetId = params.bouquetId.trim();
  if (!bouquetId) {
    return { ok: false, error: 'bouquet_id required', status: 400 };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured', status: 503 };
  }

  const { data, error } = await supabase
    .from('order_items')
    .select(
      'order_id, size, cost, source_shop_id, source_shop_name, purchase_photo_path, orders!inner(paid_at, created_at, payment_status, order_status, confirmed_shop_id, confirmed_supplier_shop_name)'
    )
    .eq('bouquet_id', bouquetId)
    .gt('cost', 0)
    .eq('orders.payment_status', 'PAID')
    .neq('orders.order_status', 'CANCELLED')
    .limit(HISTORY_FETCH_LIMIT);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  const requestedSize = trimOrNull(params.size);
  const currentOrderId = trimOrNull(params.currentOrderId);
  const rawRows = (data ?? []) as HistoryQueryRow[];
  const photoUrls = await signedPhotoUrlsByPath(
    rawRows.map((row) => trimOrNull(row.purchase_photo_path)).filter((p): p is string => Boolean(p))
  );

  const mapped: ItemPurchaseHistoryRow[] = [];
  for (const raw of rawRows) {
    const cost = parseCost(raw.cost);
    const orderId = trimOrNull(raw.order_id);
    if (cost == null || !orderId) continue;
    const order = asOrder(raw.orders);
    const shop = resolveShop(raw, order);
    const size = trimOrNull(raw.size);
    const paidAt = trimOrNull(order?.paid_at) ?? trimOrNull(order?.created_at);
    const photoPath = trimOrNull(raw.purchase_photo_path);
    mapped.push({
      order_id: orderId,
      paid_at: paidAt,
      cost,
      size,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      same_size: requestedSize == null || size === requestedSize,
      is_current_order: currentOrderId != null && orderId === currentOrderId,
      purchase_photo_url: photoPath ? photoUrls.get(photoPath) ?? null : null,
    });
  }

  mapped.sort((a, b) => {
    if (a.same_size !== b.same_size) return a.same_size ? -1 : 1;
    return paidAtMs(b.paid_at) - paidAtMs(a.paid_at);
  });

  const rows = mapped.slice(0, HISTORY_RETURN_LIMIT);
  const summarySource = requestedSize
    ? rows.filter((r) => r.same_size)
    : rows;
  const summary = summarize(summarySource.length > 0 ? summarySource : rows);

  return { ok: true, data: { summary, rows } };
}
