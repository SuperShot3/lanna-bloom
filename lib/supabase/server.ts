import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Get Supabase admin client (service role). Server-only.
 * Returns null if env vars are not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}

/**
 * Create a short-lived anon client for token-scoped customer order reads.
 * Uses x-order-token header so RLS policies can authorize by orders.public_token.
 */
export function createSupabaseAnonWithOrderToken(orderToken: string): SupabaseClient | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  const token = orderToken.trim();
  if (!url || !anonKey || !token) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        'x-order-token': token,
      },
    },
  });
}
