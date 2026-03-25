import 'server-only';

import { nanoid } from 'nanoid';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { LineDraftPayload } from './types';
import { LINE_DRAFT_TTL_MS } from './types';
import { logLineIntegrationEvent } from '@/lib/line-integration/log';

function expiresAtFromNow(): string {
  return new Date(Date.now() + LINE_DRAFT_TTL_MS).toISOString();
}

export async function upsertLineDraft(
  lineUserId: string,
  draft: LineDraftPayload
): Promise<{ expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is required for LINE drafts');

  const trimmed = lineUserId.trim();
  if (!trimmed) throw new Error('lineUserId is required');

  const expires_at = expiresAtFromNow();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('line_order_drafts')
    .select('id')
    .eq('line_user_id', trimmed)
    .maybeSingle();

  const row = {
    line_user_id: trimmed,
    draft_json: draft as unknown as Record<string, unknown>,
    expires_at,
    updated_at: now,
    handoff_token: null as string | null,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('line_order_drafts')
      .update({
        draft_json: row.draft_json,
        expires_at,
        updated_at: now,
        handoff_token: null,
      })
      .eq('line_user_id', trimmed);

    if (error) throw error;
    await logLineIntegrationEvent('draft_updated', { lineUserId: trimmed });
  } else {
    const { error } = await supabase.from('line_order_drafts').insert({
      ...row,
      created_at: now,
    });
    if (error) throw error;
    await logLineIntegrationEvent('draft_created', { lineUserId: trimmed });
  }

  return { expiresAt: expires_at };
}

export async function generateHandoffToken(lineUserId: string): Promise<{ token: string; expiresAt: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase is required for LINE drafts');

  const trimmed = lineUserId.trim();
  const token = nanoid(32);
  const expires_at = expiresAtFromNow();
  const now = new Date().toISOString();

  const { data: row, error: fetchErr } = await supabase
    .from('line_order_drafts')
    .select('line_user_id')
    .eq('line_user_id', trimmed)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) {
    throw new Error('No draft for this LINE user; create a draft first');
  }

  const { error } = await supabase
    .from('line_order_drafts')
    .update({
      handoff_token: token,
      expires_at,
      updated_at: now,
    })
    .eq('line_user_id', trimmed);

  if (error) throw error;

  await logLineIntegrationEvent('handoff_url_generated', {
    lineUserId: trimmed,
    extra: { tokenPrefix: token.slice(0, 6) },
  });

  return { token, expiresAt: expires_at };
}

export async function resolveHandoffToken(
  token: string
): Promise<{ lineUserId: string; draft: LineDraftPayload } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const t = token.trim();
  if (!t) return null;

  const { data, error } = await supabase
    .from('line_order_drafts')
    .select('line_user_id, draft_json, expires_at, handoff_token')
    .eq('handoff_token', t)
    .maybeSingle();

  if (error || !data) return null;

  if (data.handoff_token !== t) return null;

  const exp = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (exp < Date.now()) return null;

  const draft = data.draft_json as LineDraftPayload;
  if (!draft || !Array.isArray(draft.items)) return null;

  await logLineIntegrationEvent('handoff_resolved', {
    lineUserId: data.line_user_id,
  });

  return { lineUserId: data.line_user_id as string, draft };
}
