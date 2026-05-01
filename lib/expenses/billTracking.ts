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

/**
 * Resolve checklist rows for an expense: one row per order line when `linked_order_id`
 * is set (from `order_items`, else `order_json.items`), otherwise a single default row.
 */
export async function resolveBillLinesTarget(
  linkedOrderId: string | null | undefined
): Promise<ExpenseBillLineTemplate[]> {
  if (!linkedOrderId?.trim()) {
    return [{ line_id: 'default', label: 'This purchase' }];
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return [{ line_id: 'default', label: 'This purchase' }];
  }

  const oid = linkedOrderId.trim();

  const { data: rows } = await supabase
    .from('order_items')
    .select('id, bouquet_title, size, item_type, price')
    .eq('order_id', oid)
    .order('id', { ascending: true });

  if (rows && rows.length > 0) {
    return rows.map((oi) => ({
      line_id: `oi:${oi.id}`,
      label: formatDbOrderItem(oi),
    }));
  }

  const { data: orderRow } = await supabase
    .from('orders')
    .select('order_json')
    .eq('order_id', oid)
    .maybeSingle();

  const jsonItems = extractItemsFromOrderJson(orderRow?.order_json);
  if (jsonItems.length > 0) {
    return jsonItems.map((it, idx) => ({
      line_id: `oj:${idx}`,
      label: labelFromJsonItem(it, idx),
    }));
  }

  return [{ line_id: 'default', label: 'This purchase (linked order)' }];
}

/** Merge server-resolved line keys/labels with stored checkbox state. */
export function mergeBillTracking(
  stored: ExpenseBillLine[] | null | undefined,
  templates: ExpenseBillLineTemplate[]
): ExpenseBillLine[] {
  const byId = new Map((stored ?? []).map((l) => [l.line_id, l]));
  return templates.map((t) => {
    const prev = byId.get(t.line_id);
    return {
      line_id: t.line_id,
      label: t.label,
      transfer_to_shop: prev?.transfer_to_shop ?? false,
      bill_from_shop: prev?.bill_from_shop ?? false,
    };
  });
}

export function billLinesNeedPersist(
  stored: ExpenseBillLine[] | null | undefined,
  merged: ExpenseBillLine[]
): boolean {
  if (!stored || stored.length === 0) return merged.length > 0;
  if (stored.length !== merged.length) return true;
  const ids = new Set(stored.map((l) => l.line_id));
  for (const l of merged) {
    if (!ids.has(l.line_id)) return true;
  }
  return false;
}
