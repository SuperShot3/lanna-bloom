/**
 * Partner portal Supabase Auth - server only.
 * Use getPartnerSession in Server Components / Server Actions.
 */
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** Get Supabase client for server. Reads session from cookies. */
export async function createPartnerServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll from Server Component - middleware can refresh
        }
      },
    },
  });
}

/** Get current partner session (server-side). Returns null if not authenticated. */
export async function getPartnerSession(): Promise<{
  user: { id: string; email?: string };
} | null> {
  const supabase = await createPartnerServerClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return { user: { id: session.user.id, email: session.user.email ?? undefined } };
}
