/**
 * Size-aware line-item image resolution for checkout snapshots and order display.
 * Matches PDP behavior: per-size imageUrls, then gallery index mapping, then client URL.
 */
import 'server-only';

import {
  getCatalogBalloonById,
  getCatalogBouquetById,
  getCatalogPlushyToyById,
  getCatalogProductById,
} from '@/lib/catalogReads';
import {
  isUsableLineItemImageUrl,
  resolveBouquetLineItemImageUrl,
  resolveProductLikeLineItemImageUrl,
} from '@/lib/catalog/lineItemImageResolve';

export type LineItemImageType = 'bouquet' | 'product' | 'plushyToy' | 'balloon';

export {
  isUsableLineItemImageUrl,
  resolveBouquetLineItemImageUrl,
  resolveProductLikeLineItemImageUrl,
} from '@/lib/catalog/lineItemImageResolve';

export type ResolveLineItemImageInput = {
  itemType?: LineItemImageType | string | null;
  id: string;
  size?: string | null;
  clientImageUrl?: string | null;
};

/**
 * Load catalog entity and resolve the best thumb for a line item.
 * Used by checkout pricing, customer order API, and admin order detail.
 */
export async function resolveLineItemImageUrl(
  input: ResolveLineItemImageInput
): Promise<string | undefined> {
  const id = (input.id ?? '').trim();
  if (!id) {
    return isUsableLineItemImageUrl(input.clientImageUrl)
      ? input.clientImageUrl!.trim()
      : undefined;
  }

  const type = (input.itemType ?? 'bouquet') as string;
  const size = input.size ?? undefined;
  const client = input.clientImageUrl;

  if (type === 'plushyToy') {
    const toy = await getCatalogPlushyToyById(id);
    return resolveProductLikeLineItemImageUrl(toy?.imageUrl, client);
  }
  if (type === 'balloon') {
    const balloon = await getCatalogBalloonById(id);
    return resolveProductLikeLineItemImageUrl(balloon?.imageUrl, client);
  }
  if (type === 'product') {
    const product = await getCatalogProductById(id);
    return resolveProductLikeLineItemImageUrl(product?.imageUrl, client);
  }

  const bouquet = await getCatalogBouquetById(id);
  if (!bouquet) {
    return isUsableLineItemImageUrl(client) ? client!.trim() : undefined;
  }
  return resolveBouquetLineItemImageUrl(bouquet, size, client);
}
