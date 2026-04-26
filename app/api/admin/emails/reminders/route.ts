import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';

export async function GET() {
  const auth = await requireRole(['OWNER', 'MANAGER', 'SUPPORT']);
  if (!auth.ok) return auth.response;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data: rem, error: rErr } = await supabase
    .from('customer_reminders')
    .select('id, customer_name, customer_email, recipient_name, relationship, occasion_type, occasion_day, occasion_month, occasion_year, is_active, consent_given, created_at, preferred_reminder_timing')
    .order('created_at', { ascending: false })
    .limit(500);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  const ids = (rem ?? []).map((x: { id: string }) => x.id);
  const { data: logs } = await supabase
    .from('reminder_email_logs')
    .select('reminder_id, email_sent_at, email_status, occasion_year, reminder_stage')
    .in('reminder_id', ids);
  const lastByReminder = new Map<string, { at: string; status: string | null }>();
  for (const row of logs ?? []) {
    const r = row as { reminder_id: string; email_sent_at: string; email_status: string | null };
    const cur = lastByReminder.get(r.reminder_id);
    if (!cur || (r.email_sent_at && r.email_sent_at > cur.at)) {
      lastByReminder.set(r.reminder_id, { at: r.email_sent_at, status: r.email_status });
    }
  }
  const items = (rem ?? []).map((row: (typeof rem)[0]) => ({
    ...row,
    lastEmailAt: lastByReminder.get(row.id)?.at ?? null,
    lastEmailStatus: lastByReminder.get(row.id)?.status ?? null,
  }));
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['OWNER', 'MANAGER']);
  if (!auth.ok) return auth.response;
  const body = (await request.json()) as { id: string; is_active?: boolean };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const { data, error } = await supabase
    .from('customer_reminders')
    .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminder: data });
}
