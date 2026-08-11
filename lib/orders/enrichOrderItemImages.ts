/**
 * Enrich order line-item image URLs from catalog (size-aware).
 * Used by customer order API and admin order detail — display only, no DB writes.
 */
import 'server-only';

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
  const resolved = await resolveLineItemImageUrl({
    itemType: item.itemType ?? item.item_type ?? 'bouquet',
    id,
    size: item.size,
    clientImageUrl: client,
  });
  return resolved ?? (client?.trim() || undefined);
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
