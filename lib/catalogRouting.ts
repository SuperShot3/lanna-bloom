import 'server-only';

export { isCatalogReadFromSupabase } from '@/lib/catalog';
export { revalidateSupabaseCatalogCache } from '@/lib/catalogCache';
import { revalidateSupabaseCatalogCache } from '@/lib/catalogCache';

/** Bust Supabase catalog ISR caches after admin writes. */
export function revalidateCatalogCacheAfterSupabaseWrite(): void {
  if (isCatalogWriteToSupabase()) {
    revalidateSupabaseCatalogCache();
  }
}

/** Catalog writes go to Supabase by default. Set CATALOG_WRITE_SOURCE=sanity to opt out (unsupported). */
export function isCatalogWriteToSupabase(): boolean {
  return process.env.CATALOG_WRITE_SOURCE !== 'sanity';
}

/** Admin moderation reads use Supabase unless explicitly set to Sanity (unsupported). */
export function isCatalogAdminReadFromSupabase(): boolean {
  return process.env.CATALOG_WRITE_SOURCE !== 'sanity';
}

export function supabaseCatalogConfigError(): string {
  return 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
}

export function isSupabaseCatalogConfigError(message: string): boolean {
  return message.includes('SUPABASE_URL') || message.includes('SUPABASE_SERVICE_ROLE_KEY');
}
