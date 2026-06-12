/**
 * ISR cache helpers for Supabase catalog reads.
 * Aligns with storefront `revalidate = 60` on home/catalog routes.
 */
import { revalidateTag, unstable_cache } from 'next/cache';

/** Seconds — matches public catalog/home ISR. */
export const CATALOG_REVALIDATE_SECONDS = 60;

export const CATALOG_SUPABASE_TAG = 'catalog-supabase';

export function cacheSupabaseCatalog<T>(key: string, fn: () => Promise<T>): () => Promise<T> {
  return unstable_cache(fn, [`catalog-${key}`], {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: [CATALOG_SUPABASE_TAG, `catalog-${key}`],
  });
}

/** Invalidate Supabase catalog ISR caches after admin publish/moderation. */
export function revalidateSupabaseCatalogCache(): void {
  revalidateTag(CATALOG_SUPABASE_TAG);
}
