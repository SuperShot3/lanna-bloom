import 'server-only';

import type { OrderPayload } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ADMIN_PAY_LINK_SOURCE } from '@/lib/payLinks/adminPayLink';

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase is required for checkout drafts.');
  }
  return supabase;
}

/**
 * One draft row per submission_token (latest cart wins). Used for Stripe Checkout
 * metadata before an order row exists.
 */
export async function upsertCheckoutDraft(params: {
  submissionToken: string;
  payload: OrderPayload;
}): Promise<{ id: string }> {
  const supabase = requireSupabase();
  const token = params.submissionToken.trim();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkout_drafts')
    .upsert(
      {
        submission_token: token,
        payload_json: params.payload as unknown as Record<string, unknown>,
        updated_at: now,
      },
      { onConflict: 'submission_token' }
    )
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('[checkoutDrafts] upsert error:', error?.message);
    throw error ?? new Error('Failed to save checkout draft');
  }
  return { id: String(data.id) };
}

export async function getCheckoutDraftById(id: string): Promise<OrderPayload | null> {
  const row = await getCheckoutDraftRecordById(id);
  return row?.payload ?? null;
}

export async function getCheckoutDraftRecordById(
  id: string
): Promise<{ id: string; payload: OrderPayload; createdAt: string } | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('checkout_drafts')
    .select('id, payload_json, created_at')
    .eq('id', id.trim())
    .maybeSingle();

  if (error) {
    console.error('[checkoutDrafts] get error:', error.message);
    return null;
  }
  const raw = data?.payload_json;
  if (!data?.id || !raw || typeof raw !== 'object') return null;
  return {
    id: String(data.id),
    payload: raw as unknown as OrderPayload,
    createdAt: String(data.created_at ?? ''),
  };
}

/** New row (pay links). Does not upsert over a cart draft. */
export async function insertCheckoutDraft(payload: OrderPayload): Promise<{ id: string }> {
  const supabase = requireSupabase();
  const token = payload.submissionToken?.trim();
  if (!token) throw new Error('submissionToken is required');

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkout_drafts')
    .insert({
      submission_token: token,
      payload_json: payload as unknown as Record<string, unknown>,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('[checkoutDrafts] insert error:', error?.message);
    throw error ?? new Error('Failed to save checkout draft');
  }
  return { id: String(data.id) };
}

export async function listPayLinkCheckoutDrafts(limit: number): Promise<
  { id: string; payload: OrderPayload; createdAt: string }[]
> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('checkout_drafts')
    .select('id, payload_json, created_at')
    .contains('payload_json', { orderSource: ADMIN_PAY_LINK_SOURCE })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[checkoutDrafts] list pay-link drafts:', error.message);
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const raw = row.payload_json;
      if (!row.id || !raw || typeof raw !== 'object') return null;
      return {
        id: String(row.id),
        payload: raw as unknown as OrderPayload,
        createdAt: String(row.created_at ?? ''),
      };
    })
    .filter((row): row is { id: string; payload: OrderPayload; createdAt: string } => row != null);
}

export async function mergeCheckoutDraftPayload(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const row = await getCheckoutDraftRecordById(id);
  if (!row) return;
  const supabase = requireSupabase();
  const next = { ...(row.payload as unknown as Record<string, unknown>), ...patch };
  const { error } = await supabase
    .from('checkout_drafts')
    .update({
      payload_json: next,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id.trim());
  if (error) {
    console.error('[checkoutDrafts] merge payload error:', error.message);
  }
}

export async function deleteCheckoutDraftById(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('checkout_drafts').delete().eq('id', id.trim());
  if (error) {
    console.error('[checkoutDrafts] delete error:', error.message);
  }
}
