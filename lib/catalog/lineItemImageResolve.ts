/**
 * Pure size-aware line-item image helpers (no DB / server-only).
 * Used by checkout, order display enrichment, and unit tests.
 */
import type { Bouquet } from '@/lib/bouquets';
import { resolveBouquetOptionFromIdentifier } from '@/lib/bouquetOptions';
import { isStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';
import { imageIndexForSizeIndex } from '@/lib/pdpVariantMedia';

/** Usable product photo for order thumbs — skip placeholders and legacy Sanity CDN. */
export function isUsableLineItemImageUrl(url: string | undefined | null): boolean {
  const raw = (url ?? '').trim();
  if (!raw) return false;
  if (raw.startsWith('data:')) return false;
  if (raw.includes('cdn.sanity.io') || raw.includes('sanity.io')) return false;
  return isStorefrontRenderableImageUrl(raw);
}

function firstUsableImageUrl(urls: string[] | null | undefined): string | undefined {
  for (const url of urls ?? []) {
    if (isUsableLineItemImageUrl(url)) return url.trim();
  }
  return undefined;
}

/**
 * Resolve bouquet thumb: size imageUrls → PDP gallery index map → client → primary.
 */
export function resolveBouquetLineItemImageUrl(
  bouquet: Bouquet,
  sizeRaw: string | undefined,
  clientImageUrl?: string | null
): string | undefined {
  const sizes = bouquet.sizes ?? [];
  const size = resolveBouquetOptionFromIdentifier(bouquet, sizeRaw) ?? sizes[0];

  const fromSize = firstUsableImageUrl(size?.imageUrls);
  if (fromSize) return fromSize;

  const gallery = (bouquet.images ?? []).filter((u) => isUsableLineItemImageUrl(u));
  if (size && gallery.length > 0 && sizes.length > 0) {
    const sizeIndex = sizes.findIndex((candidate) => candidate.optionId === size.optionId);
    if (sizeIndex >= 0) {
      const mapped = gallery[imageIndexForSizeIndex(sizeIndex, gallery.length)];
      if (mapped) return mapped;
    }
  }

  if (isUsableLineItemImageUrl(clientImageUrl)) return clientImageUrl!.trim();

  return gallery[0];
}

/** Product / toy / balloon: keep client URL when usable, else catalog primary. */
export function resolveProductLikeLineItemImageUrl(
  catalogImageUrl: string | undefined | null,
  clientImageUrl?: string | null
): string | undefined {
  if (isUsableLineItemImageUrl(clientImageUrl)) return clientImageUrl!.trim();
  if (isUsableLineItemImageUrl(catalogImageUrl)) return catalogImageUrl!.trim();
  return undefined;
}
