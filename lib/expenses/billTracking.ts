import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ExpenseBillLine, ExpenseBillLineTemplate } from '@/types/expenses';

function itemTypeLabel(t: string | null | undefined): string {
  const m: Record<string, string> = {
    bouquet: 'Bouquet',
    product: 'Product',
    plushyToy: 'Soft toy',
    balloon: 'Balloon',
  };
  return m[t ?? ''] ?? (t ? String(t) : 'Item');
}

function formatDbOrderItem(oi: {
  bouquet_title: string | null;
  size: string | null;
  item_type: string | null;
  price: number | string | null;
}): string {
  const title = oi.bouquet_title?.trim() || itemTypeLabel(oi.item_type);
  const size = oi.size?.trim() ? ` · ${oi.size}` : '';
  const p = oi.price != null && String(oi.price) !== '' ? ` · ${oi.price} THB` : '';
  return `${title}${size}${p}`;
}

function extractItemsFromOrderJson(orderJson: unknown): Array<{
  bouquetTitle?: string;
  itemType?: string;
  size?: string;
}> {
  if (!orderJson || typeof orderJson !== 'object') return [];
  const j = orderJson as Record<string, unknown>;
  const items = j.items;
  if (!Array.isArray(items)) return [];
  return items.map((it: unknown) => {
    if (!it || typeof it !== 'object') return {};
    const o = it as Record<string, unknown>;
    return {
      bouquetTitle: typeof o.bouquetTitle === 'string' ? o.bouquetTitle : undefined,
      itemType: typeof o.itemType === 'string' ? o.itemType : undefined,
      size: typeof o.size === 'string' ? o.size : undefined,
    };
  });
}

function labelFromJsonItem(
  it: { bouquetTitle?: string; itemType?: string; size?: string },
  idx: number
): string {
  const typePart = it.itemType ? itemTypeLabel(it.itemType) : '';
  const title = it.bouquetTitle?.trim() || typePart || `Item ${idx + 1}`;
  const size = it.size?.trim() ? ` · ${it.size}` : '';
  return `${title}${size}`;
}

function deliveryCostFromRow(row: { delivery_cost?: unknown } | null | undefined): number {
  const n = parseFloat(String(row?.delivery_cost ?? ''));
  if (Number.isNaN(n) || n <= 0) return 0;
  return Math.round(n * 100) / 100;
}

/** Append COGS delivery line when order has delivery_cost &gt; 0 (flowers / linked COGS expense). */
function appendCogsDeliveryLine(
  base: ExpenseBillLineTemplate[],
  deliveryCost: number
): ExpenseBillLineTemplate[] {
  if (deliveryCost <= 0) return base;
  return [
    ...base,
    {
      line_id: 'order:delivery',
      label: `Delivery · ${deliveryCost} THB`,
      vendor_bill_applicable: false,
    },
  ];
}

/**
 * Resolve checklist rows for an expense: one row per order line when `linked_order_id`
 * is set (from `order_items`, else `order_json.items`), otherwise a single default row.
 * For **flowers** (order COGS) expenses, when the linked order has `delivery_cost` &gt; 0,
 * adds a **delivery** row (payment to driver only — one checklist step).
 */
export async function resolveBillLinesTarget(
  linkedOrderId: string | null | undefined,
  expenseCategory?: string | null
): Promise<ExpenseBillLineTemplate[]> {
  if (!linkedOrderId?.trim()) {
    return [{ line_id: 'default', label: 'This purchase' }];
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return [{ line_id: 'default', label: 'This purchase' }];
  }

  const oid = linkedOrderId.trim();
  const includeCogsDelivery = expenseCategory === 'flowers';

  const { data: rows } = await supabase
    .from('order_items')
    .select('id, bouquet_title, size, item_type, price')
    .eq('order_id', oid)
    .order('id', { ascending: true });

  if (rows && rows.length > 0) {
    const base = rows.map((oi) => ({
      line_id: `oi:${oi.id}`,
      label: formatDbOrderItem(oi),
    }));
    if (!includeCogsDelivery) return base;
    const { data: orderRow } = await supabase
      .from('orders')
      .select('delivery_cost')
      .eq('order_id', oid)
      .maybeSingle();
    return appendCogsDeliveryLine(base, deliveryCostFromRow(orderRow));
  }

  const { data: orderRow } = await supabase
    .from('orders')
    .select('order_json, delivery_cost')
    .eq('order_id', oid)
    .maybeSingle();

  const jsonItems = extractItemsFromOrderJson(orderRow?.order_json);
  if (jsonItems.length > 0) {
    const base = jsonItems.map((it, idx) => ({
      line_id: `oj:${idx}`,
      label: labelFromJsonItem(it, idx),
    }));
    return appendCogsDeliveryLine(
      base,
      includeCogsDelivery ? deliveryCostFromRow(orderRow) : 0
    );
  }

  const base = [{ line_id: 'default', label: 'This purchase (linked order)' }];
  return appendCogsDeliveryLine(
    base,
    includeCogsDelivery ? deliveryCostFromRow(orderRow) : 0
  );
}

/** Merge server-resolved line keys/labels with stored checkbox state. */
export function mergeBillTracking(
  stored: ExpenseBillLine[] | null | undefined,
  templates: ExpenseBillLineTemplate[]
): ExpenseBillLine[] {
  const byId = new Map((stored ?? []).map((l) => [l.line_id, l]));
  return templates.map((t) => {
    const prev = byId.get(t.line_id);
    const vendorBillApplicable = t.vendor_bill_applicable !== false;
    return {
      line_id: t.line_id,
      label: t.label,
      vendor_bill_applicable: vendorBillApplicable,
      transfer_to_shop: prev?.transfer_to_shop ?? false,
      bill_from_shop: vendorBillApplicable ? (prev?.bill_from_shop ?? false) : false,
    };
  });
}

export function billLinesNeedPersist(
  stored: ExpenseBillLine[] | null | undefined,
  merged: ExpenseBillLine[]
): boolean {
  if (!stored || stored.length === 0) return merged.length > 0;
  if (stored.length !== merged.length) return true;
  const byId = new Map(stored.map((l) => [l.line_id, l]));
  for (const l of merged) {
    if (!byId.has(l.line_id)) return true;
    const prev = byId.get(l.line_id)!;
    const prevV = prev.vendor_bill_applicable !== false;
    const nextV = l.vendor_bill_applicable !== false;
    if (prevV !== nextV) return true;
    // Keep checklist text in sync (e.g. "Delivery · {amount} THB" after delivery_cost changes).
    if (prev.label !== l.label) return true;
  }
  return false;
}
