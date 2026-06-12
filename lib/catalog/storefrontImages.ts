import type { CatalogStoredImage } from '@/lib/catalog/types';

export type CatalogImageFormat = 'webp' | 'png_master' | 'source';

type ImageFormatInput = {
  storage_path?: string;
  format?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Resolve stored format from metadata and storage path (storefront + admin). */
export function catalogImageFormat(input: ImageFormatInput): CatalogImageFormat | undefined {
  const meta =
    typeof input.format === 'string'
      ? input.format
      : typeof input.metadata?.format === 'string'
        ? input.metadata.format
        : undefined;
  if (meta === 'webp' || meta === 'png_master' || meta === 'source') return meta;

  const path = (input.storage_path ?? '').toLowerCase();
  if (!path) return undefined;
  if (path.endsWith('.webp')) return 'webp';
  if (isPngMasterStoragePath(path)) return 'png_master';
  if (path.endsWith('.png')) return 'source';
  return 'source';
}

/** PNG masters are kept for admin re-edits; never serve them on the public site. */
export function isPngMasterStoragePath(storagePath: string): boolean {
  const path = storagePath.toLowerCase();
  return path.endsWith('/master.png') || path.endsWith('master.png');
}

/**
 * Images safe to expose on catalog cards, PDP galleries, and inline `images` jsonb.
 * WebP (preferred), plus legacy JPEG/PNG sources migrated before the WebP pipeline.
 */
export function isStorefrontCatalogImage(input: ImageFormatInput): boolean {
  const path = input.storage_path?.trim();
  if (!path) return false;
  const format = catalogImageFormat(input);
  if (format === 'png_master') return false;
  if (isPngMasterStoragePath(path)) return false;
  return true;
}

export function filterStorefrontCatalogImages<T extends ImageFormatInput & { storage_path: string }>(
  images: T[]
): T[] {
  return images.filter(isStorefrontCatalogImage);
}

export function filterStorefrontCatalogStoredImages(
  images: CatalogStoredImage[] | null | undefined
): CatalogStoredImage[] {
  return filterStorefrontCatalogImages(images ?? []);
}
