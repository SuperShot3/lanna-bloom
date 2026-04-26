import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';

export async function GET() {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, template_key, template_name, subject_template, preview_text, is_active, updated_at, html_template, text_template')
    .order('template_key', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['OWNER', 'MANAGER']);
  if (!auth.ok) return auth.response;
  let body: {
    id?: string;
    template_key?: string;
    template_name?: string;
    subject_template?: string;
    preview_text?: string | null;
    html_template?: string;
    text_template?: string | null;
    is_active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  if (!body.id && !body.template_key) {
    return NextResponse.json({ error: 'id or template_key required' }, { status: 400 });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of [
    'template_name',
    'subject_template',
    'preview_text',
    'html_template',
    'text_template',
    'is_active',
  ] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (body.id) {
    const { data, error } = await supabase
      .from('email_templates')
      .update(patch)
      .eq('id', body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ template: data });
  }
  const { data, error } = await supabase
    .from('email_templates')
    .update(patch)
    .eq('template_key', body.template_key!.trim())
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
