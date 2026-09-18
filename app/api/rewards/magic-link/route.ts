import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createSupabaseCustomerClient } from '@/lib/supabase/serverSsr';
import { getBaseUrl } from '@/lib/siteUrl';
import { isValidLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * Sends a sign-in link. Authentication only — this route never touches credit.
 * A link is sent only if the email already has a customers row (i.e. an admin
 * issued them credit), and the response is identical either way so the
 * endpoint can't be used to discover who is a customer.
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  const lang = typeof body.lang === 'string' && isValidLocale(body.lang) ? body.lang : 'en';

  const admin = getSupabaseAdmin();
  const customerClient = await createSupabaseCustomerClient();
  if (!admin || !customerClient) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data: customer } = await admin.from('customers').select('id').eq('email', email).maybeSingle();

  if (customer) {
    const { error } = await customerClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${getBaseUrl()}/api/rewards/auth/callback?lang=${lang}`,
      },
    });
    if (error) console.error('[rewards] magic link failed:', error.message);
  }

  return NextResponse.json({ ok: true });
}
