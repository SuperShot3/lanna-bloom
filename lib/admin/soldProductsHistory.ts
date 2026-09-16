import 'server-only';

import { fetchAllSupabasePages } from '@/lib/catalog/supabasePagination';
import { indexImageUrl } from '@/lib/catalogAdmin';
import { createOrderItemPhotoSignedUrl } from '@/lib/admin/itemPurchasePhoto';
import { createOrderItemDeliveryPhotoSignedUrl } from '@/lib/admin/itemDeliveryPhoto';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  SoldProductEntityType,
  SoldProductHistoryGroup,
  SoldProductHistorySaleRow,
  SoldProductsHistoryResponse,
  SoldSaleExpense,
} from '@/lib/admin/soldProductsHistoryTypes';

const EXPENSE_RECEIPT_BUCKET = 'receipts';
const EXPENSE_RECEIPT_SIGNED_TTL_SECONDS = 60 * 15;
const IN_CLAUSE_CHUNK = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Expenses the shop actually files against an order (Flowers/COGS, Delivery, …)
 * live in the expenses system (`expenses.linked_order_id` -> `expense_receipt_images`),
 * not on the order_item. One order can carry several. Every linked expense is
 * returned even with zero images, so the UI can offer "Add photo" for each one.
 */
async function fetchExpensesByOrderId(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  orderIds: string[]
): Promise<Map<string, SoldSaleExpense[]>> {
  const byOrderId = new Map<string, SoldSaleExpense[]>();
  if (orderIds.length === 0) return byOrderId;

  type ExpenseRow = {
    id: string;
    amount: number | string | null;
    category: string | null;
    linked_order_id: string | null;
  };
  const expenseRows: ExpenseRow[] = [];
  for (const ids of chunk(orderIds, IN_CLAUSE_CHUNK)) {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, category, linked_order_id')
      .in('linked_order_id', ids);
    if (error) throw new Error(error.message);
    expenseRows.push(...((data ?? []) as ExpenseRow[]));
  }
  if (expenseRows.length === 0) return byOrderId;

  type ReceiptImageRow = { id: string; expense_id: string; file_path: string; file_name: string | null };
  const images: ReceiptImageRow[] = [];
  for (const ids of chunk(expenseRows.map((e) => e.id), IN_CLAUSE_CHUNK)) {
    const { data, error } = await supabase
      .from('expense_receipt_images')
      .select('id, expense_id, file_path, file_name')
      .in('expense_id', ids)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    images.push(...((data ?? []) as ReceiptImageRow[]));
  }

  // One batched signing call per chunk instead of one per file.
  const signedByPath = new Map<string, string>();
  const uniquePaths = Array.from(new Set(images.map((i) => i.file_path)));
  for (const batch of chunk(uniquePaths, IN_CLAUSE_CHUNK)) {
    const { data, error } = await supabase.storage
      .from(EXPENSE_RECEIPT_BUCKET)
      .createSignedUrls(batch, EXPENSE_RECEIPT_SIGNED_TTL_SECONDS);
    if (error) {
      console.error('[soldProductsHistory] receipt signing failed:', error.message);
      continue;
    }
    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) signedByPath.set(entry.path, entry.signedUrl);
    }
  }

  const imagesByExpenseId = new Map<string, ReceiptImageRow[]>();
  for (const image of images) {
    const list = imagesByExpenseId.get(image.expense_id) ?? [];
    list.push(image);
    imagesByExpenseId.set(image.expense_id, list);
  }

  for (const expense of expenseRows) {
    const orderId = expense.linked_order_id?.trim();
    if (!orderId) continue;

    const amount =
      typeof expense.amount === 'number' ? expense.amount : parseFloat(String(expense.amount ?? ''));
    const imageRows = imagesByExpenseId.get(expense.id) ?? [];

    const list = byOrderId.get(orderId) ?? [];
    list.push({
      expense_id: expense.id,
      category: expense.category?.trim() || 'expense',
      amount: Number.isFinite(amount) ? amount : null,
      images: imageRows
        .map((row) => {
          const url = signedByPath.get(row.file_path);
          if (!url) return null;
          return { id: row.id, url, file_name: row.file_name?.trim() || null };
        })
        .filter((img): img is { id: string; url: string; file_name: string | null } => img !== null),
    });
    byOrderId.set(orderId, list);
  }

  return byOrderId;
}

/**
 * Partner contact (LINE ID) for each shop, keyed by the shop id stored on
 * order_items.source_shop_id (== catalog_partners.id == partner_applications.sanity_partner_id).
 */
async function fetchShopLineIdsByShopId(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  shopIds: string[]
): Promise<Map<string, string | null>> {
  const byShopId = new Map<string, string | null>();
  if (shopIds.length === 0) return byShopId;

  type PartnerApplicationRow = { sanity_partner_id: string | null; line_id: string | null };
  for (const ids of chunk(shopIds, IN_CLAUSE_CHUNK)) {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('sanity_partner_id, line_id')
      .in('sanity_partner_id', ids);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as PartnerApplicationRow[]) {
      const shopId = trimOrNull(row.sanity_partner_id);
      const lineId = trimOrNull(row.line_id);
      if (shopId && lineId && !byShopId.has(shopId)) byShopId.set(shopId, lineId);
    }
  }

  return byShopId;
}

type NestedOrder = {
  paid_at?: string | null;
  created_at?: string | null;
  recipient_name?: string | null;
};

type SoldOrderItemRow = {
  id?: number | string | null;
  order_id?: string | null;
  bouquet_id?: string | null;
  bouquet_title?: string | null;
  item_type?: string | null;
  price?: number | string | null;
  cost?: number | string | null;
  image_url_snapshot?: string | null;
  source_shop_id?: string | null;
  source_shop_name?: string | null;
  purchase_photo_path?: string | null;
  delivery_photo_path?: string | null;
  orders?: NestedOrder | NestedOrder[] | null;
};

type CatalogEntityRow = {
  id: string;
  legacy_sanity_id: string | null;
  name_en: string | null;
  images: CatalogStoredImage[] | null;
  sold_history_notes: string | null;
  sold_history_images: CatalogStoredImage[] | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

const CATALOG_ENTITY_SELECT = 'id, legacy_sanity_id, name_en, images, sold_history_notes, sold_history_images';

/**
 * order_items.bouquet_id has no FK and can hold either the canonical catalog
 * uuid or a legacy Sanity document id (see resolveCatalogBouquetId) — batch-resolve
 * both forms so a plain `.in('id', ids)` never crashes on a non-uuid string.
 */
async function fetchCatalogEntitiesByRawIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  table: 'catalog_bouquets' | 'catalog_products',
  rawIds: string[]
): Promise<{ data: CatalogEntityRow[] | null; error: { message: string } | null }> {
  const uuidIds = rawIds.filter(isUuid);
  const legacyIds = rawIds.filter((id) => !isUuid(id));

  const [byId, byLegacy] = await Promise.all([
    uuidIds.length
      ? supabase!.from(table).select(CATALOG_ENTITY_SELECT).in('id', uuidIds)
      : Promise.resolve({ data: [] as CatalogEntityRow[], error: null }),
    legacyIds.length
      ? supabase!.from(table).select(CATALOG_ENTITY_SELECT).in('legacy_sanity_id', legacyIds)
      : Promise.resolve({ data: [] as CatalogEntityRow[], error: null }),
  ]);

  if (byId.error) return { data: null, error: byId.error };
  if (byLegacy.error) return { data: null, error: byLegacy.error };

  return { data: [...((byId.data ?? []) as CatalogEntityRow[]), ...((byLegacy.data ?? []) as CatalogEntityRow[])], error: null };
}

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
          'id, order_id, bouquet_id, bouquet_title, item_type, price, cost, image_url_snapshot, source_shop_id, source_shop_name, purchase_photo_path, delivery_photo_path, orders!inner(paid_at, created_at, payment_status, order_status, recipient_name)'
        )
        .eq('orders.payment_status', 'PAID')
        .neq('orders.order_status', 'CANCELLED')
        .range(page.from, page.to)
    );
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Query failed', status: 500 };
  }

  // Resolve raw order_items.bouquet_id values (uuid or legacy Sanity id) to their
  // canonical catalog row *before* grouping, so a product with both old (legacy id)
  // and new (uuid) sales history merges into a single group instead of splitting
  // into two rows that each look like a partial sales history.
  const rawBouquetIds = new Set<string>();
  const rawProductIds = new Set<string>();
  for (const raw of (rawRows as SoldOrderItemRow[])) {
    const productId = trimOrNull(raw.bouquet_id);
    if (!productId) continue;
    if (normalizeEntityType(raw.item_type) === 'product') rawProductIds.add(productId);
    else rawBouquetIds.add(productId);
  }

  const [bouquetRowsResult, productRowsResult] = await Promise.all([
    fetchCatalogEntitiesByRawIds(supabase, 'catalog_bouquets', Array.from(rawBouquetIds)),
    fetchCatalogEntitiesByRawIds(supabase, 'catalog_products', Array.from(rawProductIds)),
  ]);

  if (bouquetRowsResult.error) {
    return { ok: false, error: bouquetRowsResult.error.message, status: 500 };
  }
  if (productRowsResult.error) {
    return { ok: false, error: productRowsResult.error.message, status: 500 };
  }

  // Batch-resolve signed URLs for COGS receipt photos (private `receipts` bucket,
  // same mechanism as the order-detail purchase-history panel).
  const purchasePhotoPaths = Array.from(
    new Set(
      (rawRows as SoldOrderItemRow[])
        .map((raw) => trimOrNull(raw.purchase_photo_path))
        .filter((p): p is string => Boolean(p))
    )
  );
  const purchasePhotoUrlByPath = new Map<string, string>();
  await Promise.all(
    purchasePhotoPaths.map(async (path) => {
      const signed = await createOrderItemPhotoSignedUrl(path);
      if (signed.ok) purchasePhotoUrlByPath.set(path, signed.signedUrl);
    })
  );

  // Batch-resolve signed URLs for delivered-bouquet photos (private `receipts`
  // bucket, added by admin/florist after the sale — distinct from the receipt above).
  const deliveryPhotoPaths = Array.from(
    new Set(
      (rawRows as SoldOrderItemRow[])
        .map((raw) => trimOrNull(raw.delivery_photo_path))
        .filter((p): p is string => Boolean(p))
    )
  );
  const deliveryPhotoUrlByPath = new Map<string, string>();
  await Promise.all(
    deliveryPhotoPaths.map(async (path) => {
      const signed = await createOrderItemDeliveryPhotoSignedUrl(path);
      if (signed.ok) deliveryPhotoUrlByPath.set(path, signed.signedUrl);
    })
  );

  // Real filed receipts for the order (Flowers/COGS, Delivery, …) from the expenses system.
  const orderIds = Array.from(
    new Set(
      (rawRows as SoldOrderItemRow[])
        .map((raw) => trimOrNull(raw.order_id))
        .filter((id): id is string => Boolean(id))
    )
  );
  let expensesByOrderId = new Map<string, SoldSaleExpense[]>();
  try {
    expensesByOrderId = await fetchExpensesByOrderId(supabase, orderIds);
  } catch (error) {
    // Expenses/receipts are supplementary — never fail the whole page over them.
    console.error(
      '[soldProductsHistory] expenses lookup failed:',
      error instanceof Error ? error.message : error
    );
  }

  const shopIds = Array.from(
    new Set(
      (rawRows as SoldOrderItemRow[])
        .map((raw) => trimOrNull(raw.source_shop_id))
        .filter((id): id is string => Boolean(id))
    )
  );
  let shopLineIdsByShopId = new Map<string, string | null>();
  try {
    shopLineIdsByShopId = await fetchShopLineIdsByShopId(supabase, shopIds);
  } catch (error) {
    // Contact info is supplementary — never fail the whole page over it.
    console.error(
      '[soldProductsHistory] shop LINE id lookup failed:',
      error instanceof Error ? error.message : error
    );
  }

  // Maps the *raw* order_items.bouquet_id value (uuid or legacy Sanity id) to the
  // resolved catalog row, so both id forms for the same product land on one entry.
  const catalogByRawId = new Map<string, CatalogEntityRow>();
  for (const row of bouquetRowsResult.data ?? []) {
    catalogByRawId.set(`bouquet:${row.id}`, row);
    if (row.legacy_sanity_id) catalogByRawId.set(`bouquet:${row.legacy_sanity_id}`, row);
  }
  for (const row of productRowsResult.data ?? []) {
    catalogByRawId.set(`product:${row.id}`, row);
    if (row.legacy_sanity_id) catalogByRawId.set(`product:${row.legacy_sanity_id}`, row);
  }

  type GroupKey = string;
  type SaleRowWithTitle = SoldProductHistorySaleRow & { title: string | null };
  const buckets = new Map<
    GroupKey,
    { entityType: SoldProductEntityType; productId: string; history: SaleRowWithTitle[] }
  >();

  for (const raw of (rawRows as SoldOrderItemRow[])) {
    const rawProductId = trimOrNull(raw.bouquet_id);
    const orderId = trimOrNull(raw.order_id);
    if (!rawProductId || !orderId) continue;

    const entityType = normalizeEntityType(raw.item_type);
    const catalogRow = catalogByRawId.get(`${entityType}:${rawProductId}`);
    // Group by the canonical catalog id when resolved, falling back to the raw
    // value only when orphaned (nothing in the catalog resolves it).
    const productId = catalogRow?.id ?? rawProductId;
    const key: GroupKey = `${entityType}:${productId}`;
    const order = asOrder(raw.orders);
    const paidAt = trimOrNull(order?.paid_at) ?? trimOrNull(order?.created_at);
    const itemId = raw.id != null ? String(raw.id) : null;
    if (!itemId) continue;
    const purchasePhotoPath = trimOrNull(raw.purchase_photo_path);
    const deliveryPhotoPath = trimOrNull(raw.delivery_photo_path);
    const shopId = trimOrNull(raw.source_shop_id);

    const saleRow: SaleRowWithTitle = {
      order_id: orderId,
      item_id: itemId,
      paid_at: paidAt,
      price: parsePrice(raw.price),
      cost: parsePrice(raw.cost),
      shop_id: shopId,
      shop_name: trimOrNull(raw.source_shop_name),
      shop_line_id: shopId ? shopLineIdsByShopId.get(shopId) ?? null : null,
      image_snapshot: trimOrNull(raw.image_url_snapshot),
      recipient_name: trimOrNull(order?.recipient_name),
      purchase_photo_path: purchasePhotoPath,
      purchase_photo_url: purchasePhotoPath ? purchasePhotoUrlByPath.get(purchasePhotoPath) ?? null : null,
      delivery_photo_path: deliveryPhotoPath,
      delivery_photo_url: deliveryPhotoPath ? deliveryPhotoUrlByPath.get(deliveryPhotoPath) ?? null : null,
      expenses: expensesByOrderId.get(orderId) ?? [],
      title: trimOrNull(raw.bouquet_title),
    };

    const existing = buckets.get(key);
    if (existing) {
      existing.history.push(saleRow);
    } else {
      buckets.set(key, { entityType, productId, history: [saleRow] });
    }
  }

  const groups: SoldProductHistoryGroup[] = [];
  for (const [, bucket] of Array.from(buckets.entries())) {
    const catalogRow = catalogByRawId.get(`${bucket.entityType}:${bucket.productId}`);
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
      last_cost: last?.cost ?? null,
      last_shop_name: last?.shop_name ?? null,
      sold_history_notes: catalogRow?.sold_history_notes ?? null,
      sold_history_images: (catalogRow?.sold_history_images ?? []) as CatalogStoredImage[],
      history,
    });
  }

  groups.sort((a, b) => paidAtMs(b.last_sold_at) - paidAtMs(a.last_sold_at));

  return { ok: true, data: { groups } };
}
