/**
 * Enrich order line-item image URLs from catalog (size-aware).
 * Used by customer order API, admin order detail, and delivery board — display only, no DB writes.
 */
import 'server-only';

import type { SupabaseOrderRow } from '@/lib/supabase/adminQueries';
import { resolveLineItemImageUrl } from '@/lib/catalog/resolveLineItemImage';

export type EnrichableOrderItemImage = {
  bouquetId?: string | null;
  bouquet_id?: string | null;
  size?: string | null;
  imageUrl?: string | null;
  image_url_snapshot?: string | null;
  itemType?: string | null;
  item_type?: string | null;
};

export async function enrichOrderItemImageUrl(
  item: EnrichableOrderItemImage
): Promise<string | undefined> {
  const id = (item.bouquetId ?? item.bouquet_id ?? '').trim();
  const client = item.imageUrl ?? item.image_url_snapshot ?? undefined;
  try {
    const resolved = await resolveLineItemImageUrl({
      itemType: item.itemType ?? item.item_type ?? 'bouquet',
      id,
      size: item.size,
      clientImageUrl: client,
    });
    return resolved ?? (client?.trim() || undefined);
  } catch (err) {
    console.error('[enrichOrderItemImageUrl] catalog lookup failed:', err, { id });
    return client?.trim() || undefined;
  }
}

/** Map order.items[] replacing imageUrl with catalog-resolved thumbs. */
export async function enrichOrderItemsImages<T extends EnrichableOrderItemImage>(
  items: T[]
): Promise<Array<T & { imageUrl?: string }>> {
  return Promise.all(
    items.map(async (item) => {
      const imageUrl = await enrichOrderItemImageUrl(item);
      return { ...item, ...(imageUrl ? { imageUrl } : {}) };
    })
  );
}

type OrderJsonWithItems = {
  items?: Array<{
    bouquetId?: string;
    size?: string;
    imageUrl?: string;
    itemType?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

/**
 * Rewrite `order_json.items[].imageUrl` with size-aware catalog thumbs for the
 * admin delivery board (display-only; does not persist).
 */
export async function enrichDeliveryBoardOrderImages(
  orders: SupabaseOrderRow[]
): Promise<SupabaseOrderRow[]> {
  return Promise.all(
    orders.map(async (order) => {
      const json = order.order_json as OrderJsonWithItems | null | undefined;
      const items = Array.isArray(json?.items) ? json.items : null;
      if (!items?.length) return order;

      const enrichedItems = await enrichOrderItemsImages(
        items.map((it) => ({
          bouquetId: it.bouquetId,
          size: it.size,
          imageUrl: it.imageUrl,
          itemType: it.itemType ?? 'bouquet',
        }))
      );

      const nextItems = items.map((it, i) => {
        const imageUrl = enrichedItems[i]?.imageUrl;
        return imageUrl ? { ...it, imageUrl } : it;
      });

      return {
        ...order,
        order_json: {
          ...(json ?? {}),
          items: nextItems,
        },
      };
    })
  );
}
