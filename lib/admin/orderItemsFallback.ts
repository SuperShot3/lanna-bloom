import type { SupabaseOrderItemRow } from '@/lib/supabase/adminQueries';

/** Build order_items-style rows from order_json when order_items table is empty (e.g. legacy orders). */
export function itemsFromOrderJson(
  orderId: string,
  jsonItems: Array<{
    bouquetId?: string;
    bouquetTitle?: string;
    size?: string;
    price?: number;
    imageUrl?: string;
    itemType?: string;
    cost?: number;
    commissionAmount?: number;
  }>
): SupabaseOrderItemRow[] {
  return jsonItems.map((it) => ({
    order_id: orderId,
    bouquet_id: it.bouquetId ?? null,
    bouquet_title: it.bouquetTitle ?? null,
    size: it.size ?? null,
    price: it.price ?? null,
    image_url_snapshot: it.imageUrl ?? null,
    item_type: (it.itemType === 'product'
      ? 'product'
      : it.itemType === 'plushyToy'
        ? 'plushyToy'
        : it.itemType === 'balloon'
          ? 'balloon'
          : 'bouquet') as 'bouquet' | 'product' | 'plushyToy' | 'balloon',
    cost: it.cost ?? null,
    commission_amount: it.commissionAmount ?? null,
  }));
}
