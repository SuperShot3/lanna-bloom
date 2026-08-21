import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { AttributionSessionRow, AttributionSnapshot } from './types';
import { snapshotToSessionFields } from './rules';

const SESSION_SELECT =
  'id, visitor_id, source, medium, gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id, adgroup_id, keyword, device, network, matchtype, landing_page, referrer, first_seen_at, last_seen_at';

export function isMissingAttributionRelationError(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const msg = String(error.message ?? '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (msg.includes('attribution_sessions') && msg.includes('does not exist')) ||
    (msg.includes('google_ads_offline_conversions') && msg.includes('does not exist')) ||
    msg.includes('could not find the table')
  );
}

export async function getAttributionSessionByVisitorId(
  visitorId: string,
): Promise<AttributionSessionRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !visitorId.trim()) return null;
  const { data, error } = await supabase
    .from('attribution_sessions')
    .select(SESSION_SELECT)
    .eq('visitor_id', visitorId.trim())
    .maybeSingle();
  if (error) {
    if (isMissingAttributionRelationError(error)) return null;
    console.error('[attribution] get by visitor_id failed:', error.message);
    return null;
  }
  return (data as AttributionSessionRow | null) ?? null;
}

export async function getAttributionSessionById(id: string): Promise<AttributionSessionRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !id.trim()) return null;
  const { data, error } = await supabase
    .from('attribution_sessions')
    .select(SESSION_SELECT)
    .eq('id', id.trim())
    .maybeSingle();
  if (error) {
    if (isMissingAttributionRelationError(error)) return null;
    console.error('[attribution] get by id failed:', error.message);
    return null;
  }
  return (data as AttributionSessionRow | null) ?? null;
}

export async function upsertAttributionSession(input: {
  visitorId: string;
  snapshot: AttributionSnapshot;
  nowMs?: number;
}): Promise<AttributionSessionRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const visitorId = input.visitorId.trim();
  if (!visitorId) return null;

  const nowMs = input.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const fields = snapshotToSessionFields(input.snapshot, nowMs);

  const { data, error } = await supabase
    .from('attribution_sessions')
    .upsert(
      {
        visitor_id: visitorId,
        ...fields,
        last_seen_at: nowIso,
      },
      { onConflict: 'visitor_id' },
    )
    .select(SESSION_SELECT)
    .single();

  if (error) {
    if (isMissingAttributionRelationError(error)) return null;
    console.error('[attribution] upsert session failed:', error.message);
    return null;
  }

  const row = data as AttributionSessionRow | null;
  if (row && !row.first_seen_at) {
    return { ...row, first_seen_at: nowIso };
  }
  return row;
}
