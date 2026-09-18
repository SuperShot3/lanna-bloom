import { NextResponse } from 'next/server';
import { createSupabaseCustomerClient } from '@/lib/supabase/serverSsr';

export const dynamic = 'force-dynamic';

export async function POST() {
  const client = await createSupabaseCustomerClient();
  await client?.auth.signOut();
  return NextResponse.json({ ok: true });
}
