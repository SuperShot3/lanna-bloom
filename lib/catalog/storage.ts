import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogStoredImage } from '@/lib/catalog/types';
import { isStorefrontRenderableImageUrl } from '@/lib/catalog/catalogImage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogSupabaseClient = SupabaseClient<any, 'public', any>;

export const CATALOG_BUCKET = 'catalog';

export function catalogPublicUrl(supabase: CatalogSupabaseClient, storagePath: string): string {
  const { data } = supabase.storage.from(CATALOG_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export function storedImagePublicUrl(
  supabase: CatalogSupabaseClient,
  image: CatalogStoredImage
): string {
  const publicUrl = image.public_url?.trim();
  if (publicUrl && isStorefrontRenderableImageUrl(publicUrl)) return publicUrl;
  return catalogPublicUrl(supabase, image.storage_path);
}

export async function uploadBufferToCatalog(
  supabase: CatalogSupabaseClient,
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const { error } = await supabase.storage.from(CATALOG_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed (${storagePath}): ${error.message}`);
}

export function buildCatalogImageRecord(
  supabase: CatalogSupabaseClient,
  storagePath: string,
  meta: Omit<CatalogStoredImage, 'storage_path' | 'public_url'>
): CatalogStoredImage {
  return {
    storage_path: storagePath,
    public_url: catalogPublicUrl(supabase, storagePath),
    ...meta,
  };
}
