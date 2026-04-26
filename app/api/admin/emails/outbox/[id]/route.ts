import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data, error } = await supabase.from('email_outbox').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ outbox: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['OWNER', 'MANAGER']);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const { id } = await params;
  let body: { subject?: string; html_body?: string; text_body?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const adminEmail = session.user.email ?? 'unknown';
  const patch: Record<string, unknown> = { edited_by: adminEmail, updated_at: new Date().toISOString() };
  if (body.subject != null) patch.subject = body.subject;
  if (body.html_body != null) patch.html_body = body.html_body;
  if (body.text_body !== undefined) patch.text_body = body.text_body;
  const { data: row, error: uErr } = await supabase
    .from('email_outbox')
    .update(patch)
    .eq('id', id)
    .in('status', ['draft', 'failed', 'scheduled'])
    .select()
    .single();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ outbox: row });
}
