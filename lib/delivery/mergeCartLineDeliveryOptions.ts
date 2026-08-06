import type { CartLineDeliveryConstraintInput } from '@/lib/delivery/deliveryConstraints';

/**
 * Merge catalog delivery_options onto cart lines for constraint math.
 * Catalog wins when an entry exists for the line's bouquetId; otherwise keep localStorage.
 */
export function mergeCartLinesWithCatalogOptions(
  items: CartLineDeliveryConstraintInput[],
  catalogById: Record<string, string[] | undefined> | null | undefined
): CartLineDeliveryConstraintInput[] {
  if (!catalogById || Object.keys(catalogById).length === 0) {
    return items.map((line) => ({
      itemType: line.itemType,
      deliveryOptions: line.deliveryOptions,
      ...(line.bouquetId ? { bouquetId: line.bouquetId } : {}),
    }));
  }

  return items.map((line) => {
    const itemType = line.itemType ?? 'bouquet';
    if (itemType !== 'bouquet') {
      return { itemType, deliveryOptions: line.deliveryOptions };
    }
    const id = typeof line.bouquetId === 'string' ? line.bouquetId.trim() : '';
    if (id && Object.prototype.hasOwnProperty.call(catalogById, id)) {
      return {
        itemType: 'bouquet',
        deliveryOptions: catalogById[id] ?? [],
        bouquetId: id,
      };
    }
    return {
      itemType: 'bouquet',
      deliveryOptions: line.deliveryOptions,
      ...(id ? { bouquetId: id } : {}),
    };
  });
}

/** Bouquet ids that need a catalog refresh for delivery constraints. */
export function bouquetIdsForDeliveryOptionsLookup(
  items: CartLineDeliveryConstraintInput[]
): string[] {
  const ids = new Set<string>();
  for (const line of items) {
    if ((line.itemType ?? 'bouquet') !== 'bouquet') continue;
    const id = typeof line.bouquetId === 'string' ? line.bouquetId.trim() : '';
    if (id) ids.add(id);
  }
  return Array.from(ids);
}
