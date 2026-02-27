/**
 * Partner portal Supabase Auth - browser client only.
 * Use createPartnerBrowserClient in Client Components for signIn/signOut.
 * For server: use getPartnerSession from partnerAuthServer.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** Options for partner browser client */
export interface PartnerBrowserClientOptions {
  /** When false, session cookie expires in 1 day (session-like). When true (default), persists ~400 days. */
  rememberMe?: boolean;
}

/** Create Supabase client for browser (Client Components). Use for signIn/signOut. */
export function createPartnerBrowserClient(
  options?: PartnerBrowserClientOptions
): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const rememberMe = options?.rememberMe !== false;
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: rememberMe
      ? undefined
      : { maxAge: 24 * 60 * 60 },
    isSingleton: rememberMe,
  });
}
