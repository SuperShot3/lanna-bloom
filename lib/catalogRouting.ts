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

/** Safety guard: catalog writes always go to Supabase; no other source is supported. */
export function isCatalogWriteToSupabase(): boolean {
  return process.env.CATALOG_WRITE_SOURCE !== 'sanity';
}

/** Safety guard: admin moderation reads always use Supabase; no other source is supported. */
export function isCatalogAdminReadFromSupabase(): boolean {
  return process.env.CATALOG_WRITE_SOURCE !== 'sanity';
}

export function supabaseCatalogConfigError(): string {
  return 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
}

export function isSupabaseCatalogConfigError(message: string): boolean {
  return message.includes('SUPABASE_URL') || message.includes('SUPABASE_SERVICE_ROLE_KEY');
}
