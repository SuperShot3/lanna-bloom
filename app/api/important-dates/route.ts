import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const REL = new Set([
  'wife_girlfriend',
  'husband_boyfriend',
  'mother',
  'father',
  'friend',
  'boss',
  'colleague',
  'client',
  'other',
]);
const OCC = new Set([
  'birthday',
  'anniversary',
  'valentine',
  'mothers_day',
  'congratulations',
  'apology',
  'get_well',
  'custom',
  'other',
]);
const TIMING = new Set(['7_and_3_days', '7_days_only', '3_days_only', 'all']);

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const body = (await request.json()) as {
    customer_name?: string;
    customer_email?: string;
    recipient_name?: string;
    relationship?: string;
    occasion_type?: string;
    occasion_day?: number;
    occasion_month?: number;
    occasion_year?: number | null;
    preferred_budget?: string;
    preferred_flower_style?: string;
    preferred_reminder_timing?: string;
    consent?: boolean;
    source_order_id?: string;
  };
  if (!body.consent) {
    return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
  }
  const email = (body.customer_email ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  const name = (body.customer_name ?? '').trim();
  const rname = (body.recipient_name ?? '').trim();
  if (!name || !rname) {
    return NextResponse.json({ error: 'Name fields are required' }, { status: 400 });
  }
  const rel = (body.relationship ?? 'other').trim();
  if (!REL.has(rel)) {
    return NextResponse.json({ error: 'Invalid relationship' }, { status: 400 });
  }
  const occ = (body.occasion_type ?? 'custom').trim();
  if (!OCC.has(occ)) {
    return NextResponse.json({ error: 'Invalid occasion' }, { status: 400 });
  }
  const day = Math.floor(Number(body.occasion_day));
  const month = Math.floor(Number(body.occasion_month));
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  const timing = (body.preferred_reminder_timing ?? '7_and_3_days').trim();
  if (!TIMING.has(timing)) {
    return NextResponse.json({ error: 'Invalid reminder timing' }, { status: 400 });
  }
  const token = randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('customer_reminders')
    .insert({
      customer_name: name,
      customer_email: email,
      recipient_name: rname,
      relationship: rel,
      occasion_type: occ,
      occasion_day: day,
      occasion_month: month,
      occasion_year: body.occasion_year != null ? Math.floor(body.occasion_year) : null,
      preferred_budget: body.preferred_budget?.trim() || null,
      preferred_flower_style: body.preferred_flower_style?.trim() || null,
      preferred_reminder_timing: timing,
      consent_given: true,
      consent_timestamp: now,
      source_order_id: body.source_order_id?.trim() || null,
      unsubscribe_token: token,
    })
    .select('id')
    .single();
  if (error) {
    console.error('[important-dates]', error);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
