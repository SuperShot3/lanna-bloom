import 'server-only';

import type { OrderPayload } from '@/lib/orders';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('checkout_drafts')
    .select('payload_json')
    .eq('id', id.trim())
    .maybeSingle();

  if (error) {
    console.error('[checkoutDrafts] get error:', error.message);
    return null;
  }
  const raw = data?.payload_json;
  if (!raw || typeof raw !== 'object') return null;
  return raw as unknown as OrderPayload;
}

export async function deleteCheckoutDraftById(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('checkout_drafts').delete().eq('id', id.trim());
  if (error) {
    console.error('[checkoutDrafts] delete error:', error.message);
  }
}
