import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';

export async function GET() {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  const { data, error } = await supabase
    .from('email_outbox')
    .select('id, order_id, customer_email, email_type, status, created_at, sent_at, subject')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
