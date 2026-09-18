import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { REWARD_LIMITS } from '@/lib/rewards/limits';

export type CreditTransactionType = 'issue' | 'redeem' | 'reversal' | 'expire';

export type CreditTransaction = {
  id: string;
  customer_id: string;
  type: CreditTransactionType;
  amount: number;
  currency: string;
  campaign_id: string | null;
  order_id: string | null;
  checkout_draft_id: string | null;
  reversed_transaction_id: string | null;
  expires_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  email: string;
  auth_user_id: string | null;
  name: string | null;
  phone: string | null;
  birthday: string | null;
  anniversary: string | null;
  marketing_email_consent: boolean;
  created_at: string;
  updated_at: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Looks up a customer by (normalized) email. Does not create one. */
export async function getCustomerByEmail(email: string): Promise<Result<Customer | null>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', normalizeEmail(email))
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data as Customer) ?? null };
}

/**
 * Finds a customer by email, creating a minimal row if one doesn't exist yet.
 * This is the only place a `customers` row gets created outside of the
 * magic-link auth callback — used when an admin issues credit or adds a
 * campaign recipient by email before that person has ever signed in.
 */
export async function getOrCreateCustomerByEmail(
  email: string,
  name?: string | null
): Promise<Result<Customer>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: 'Email is required' };

  const existing = await getCustomerByEmail(normalized);
  if (!existing.ok) return existing;
  if (existing.data) return { ok: true, data: existing.data };

  const { data, error } = await supabase
    .from('customers')
    .insert({ email: normalized, name: name?.trim() || null })
    .select('*')
    .single();

  if (error) {
    // Unique-violation race: another request created the same customer first.
    if (error.code === '23505') {
      const refetched = await getCustomerByEmail(normalized);
      if (refetched.ok && refetched.data) return { ok: true, data: refetched.data };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data as Customer };
}

/** Current available balance, derived from the ledger (never a stored/mutable column). */
export async function getCustomerBalance(customerId: string): Promise<Result<number>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('customer_id', customerId);

  if (error) return { ok: false, error: error.message };
  const balance = (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  return { ok: true, data: balance };
}

export async function listCustomerTransactions(
  customerId: string,
  opts: { limit?: number } = {}
): Promise<Result<CreditTransaction[]>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 100);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as CreditTransaction[] };
}

/** Maps a known RPC error message to a stable, user-facing reason code. */
function mapRpcError(message: string | undefined): string {
  const known = [
    'invalid_or_over_reward_limit',
    'exceeds_max_balance',
    'invalid_amount',
    'exceeds_per_order_limit',
    'insufficient_balance',
    'already_reversed',
    'not_found',
  ];
  const match = known.find((code) => message?.includes(code));
  return match ?? message ?? 'unknown_error';
}

export async function issueCredit(params: {
  customerId: string;
  amount: number;
  campaignId?: string | null;
  expiresAt?: string | null;
  createdBy: string;
  notes?: string | null;
}): Promise<Result<CreditTransaction>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('issue_credit', {
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_campaign_id: params.campaignId ?? null,
    p_expires_at: params.expiresAt ?? null,
    p_created_by: params.createdBy,
    p_max_issue_per_reward: REWARD_LIMITS.maxIssuePerReward,
    p_max_customer_balance: REWARD_LIMITS.maxCustomerBalance,
    p_notes: params.notes ?? null,
  });

  if (error) return { ok: false, error: mapRpcError(error.message), code: error.code };
  return { ok: true, data: data as CreditTransaction };
}

export async function reserveCreditRedemption(params: {
  customerId: string;
  amount: number;
  checkoutDraftId: string;
}): Promise<Result<CreditTransaction>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('reserve_credit_redemption', {
    p_customer_id: params.customerId,
    p_amount: params.amount,
    p_checkout_draft_id: params.checkoutDraftId,
    p_max_spend_per_order: REWARD_LIMITS.maxSpendPerOrder,
  });

  if (error) return { ok: false, error: mapRpcError(error.message), code: error.code };
  return { ok: true, data: data as CreditTransaction };
}

export async function attachCreditRedemptionToOrder(
  transactionId: string,
  orderId: string
): Promise<Result<boolean>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('attach_credit_redemption_to_order', {
    p_transaction_id: transactionId,
    p_order_id: orderId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: Boolean(data) };
}

export async function reverseCreditTransaction(
  transactionId: string,
  createdBy: string
): Promise<Result<CreditTransaction>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase.rpc('reverse_credit_transaction', {
    p_transaction_id: transactionId,
    p_created_by: createdBy,
  });

  if (error) return { ok: false, error: mapRpcError(error.message), code: error.code };
  return { ok: true, data: data as CreditTransaction };
}
