import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['OWNER', 'MANAGER']);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('email_outbox')
    .update({ status: 'cancelled', updated_at: now, edited_by: auth.session.user.email ?? 'unknown' })
    .eq('id', id)
    .in('status', ['draft', 'scheduled'])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outbox: data });
}
