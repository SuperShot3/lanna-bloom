import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseCustomerClient } from '@/lib/supabase/serverSsr';
import { isValidLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * Magic-link landing. Verifies email ownership and starts a session, then links
 * auth user -> customers row by verified email. It never issues, changes or
 * spends credit — no ledger function is imported here by design.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const langParam = searchParams.get('lang') ?? 'en';
  const lang = isValidLocale(langParam) ? langParam : 'en';
  const done = (status?: string) =>
    NextResponse.redirect(`${origin}/${lang}/rewards${status ? `?status=${status}` : ''}`);

  const code = searchParams.get('code');
  if (!code) return done('link_invalid');

  const customerClient = await createSupabaseCustomerClient();
  const admin = getSupabaseAdmin();
  if (!customerClient || !admin) return done('unavailable');

  const { data, error } = await customerClient.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return done('link_invalid');

  const { error: linkError } = await admin
    .from('customers')
    .update({ auth_user_id: data.user.id })
    .eq('email', data.user.email.toLowerCase())
    .is('auth_user_id', null);
  if (linkError) console.error('[rewards] customer link failed:', linkError.message);

  return done();
}
