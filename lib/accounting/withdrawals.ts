import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  AccountingWithdrawal,
  AccountingWithdrawalStatus,
} from '@/types/accountingWithdrawals';

const TABLE = 'accounting_withdrawals';

const PURPOSE_MIN_LEN = 2;
const PURPOSE_MAX_LEN = 500;

export function validateWithdrawalPurpose(purpose: string): string | null {
  const trimmed = purpose.trim();
  if (trimmed.length < PURPOSE_MIN_LEN) {
    return `purpose must be at least ${PURPOSE_MIN_LEN} characters`;
  }
  if (trimmed.length > PURPOSE_MAX_LEN) {
    return `purpose must be at most ${PURPOSE_MAX_LEN} characters`;
  }
  return null;
}

export interface CreateWithdrawalInput {
  amount: number;
  currency?: string;
  withdrawal_date: string;
  from_location: string;
  purpose: string;
  notes?: string | null;
  status?: AccountingWithdrawalStatus;
  proof_file_path?: string | null;
  proof_attached?: boolean;
  created_by: string;
}

export interface UpdateWithdrawalPatch {
  amount?: number;
  withdrawal_date?: string;
  purpose?: string;
  notes?: string | null;
  proof_file_path?: string | null;
  proof_attached?: boolean;
}

export async function createAccountingWithdrawal(
  input: CreateWithdrawalInput
): Promise<{ withdrawal: AccountingWithdrawal | null; error?: string }> {
  const purposeErr = validateWithdrawalPurpose(input.purpose);
  if (purposeErr) return { withdrawal: null, error: purposeErr };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { withdrawal: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      amount: input.amount,
      currency: input.currency ?? 'THB',
      withdrawal_date: input.withdrawal_date,
      from_location: input.from_location,
      purpose: input.purpose.trim(),
      notes: input.notes?.trim() || null,
      status: input.status ?? 'confirmed',
      proof_file_path: input.proof_file_path ?? null,
      proof_attached: input.proof_attached ?? !!input.proof_file_path,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('[withdrawals] createAccountingWithdrawal error:', error.message);
    return { withdrawal: null, error: error.message };
  }

  return { withdrawal: data as AccountingWithdrawal };
}

export async function getAccountingWithdrawalById(id: string): Promise<AccountingWithdrawal | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[withdrawals] getAccountingWithdrawalById error:', error.message);
    return null;
  }

  return data as AccountingWithdrawal;
}

export async function getAccountingWithdrawals(
  filter: { dateFrom?: string; dateTo?: string; fromLocation?: string } = {}
): Promise<{ withdrawals: AccountingWithdrawal[]; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { withdrawals: [], error: 'Supabase not configured' };

  let q = supabase.from(TABLE).select('*');
  if (filter.dateFrom) q = q.gte('withdrawal_date', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) q = q.lte('withdrawal_date', filter.dateTo.slice(0, 10));
  if (filter.fromLocation) q = q.eq('from_location', filter.fromLocation);

  const { data, error } = await q
    .order('withdrawal_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[withdrawals] getAccountingWithdrawals error:', error.message);
    return { withdrawals: [], error: error.message };
  }
  return { withdrawals: (data ?? []) as AccountingWithdrawal[] };
}

export async function updateAccountingWithdrawal(
  id: string,
  patch: UpdateWithdrawalPatch
): Promise<{ withdrawal: AccountingWithdrawal | null; error?: string }> {
  if (patch.purpose != null) {
    const purposeErr = validateWithdrawalPurpose(patch.purpose);
    if (purposeErr) return { withdrawal: null, error: purposeErr };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { withdrawal: null, error: 'Supabase not configured' };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.amount != null) update.amount = patch.amount;
  if (patch.withdrawal_date != null) update.withdrawal_date = patch.withdrawal_date;
  if (patch.purpose != null) update.purpose = patch.purpose.trim();
  if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
  if (patch.proof_file_path !== undefined) {
    update.proof_file_path = patch.proof_file_path;
    update.proof_attached = patch.proof_attached ?? !!patch.proof_file_path;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[withdrawals] updateAccountingWithdrawal error:', error.message);
    return { withdrawal: null, error: error.message };
  }

  return { withdrawal: data as AccountingWithdrawal };
}

export async function deleteAccountingWithdrawal(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { error } = await supabase.from(TABLE).delete().eq('id', id);

  if (error) {
    console.error('[withdrawals] deleteAccountingWithdrawal error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function sumWithdrawalsInRange(
  filter: { dateFrom?: string; dateTo?: string; fromLocation?: string } = {}
): Promise<{ total: number; count: number; error?: string }> {
  const result = await getAccountingWithdrawals(filter);
  if (result.error) return { total: 0, count: 0, error: result.error };

  let total = 0;
  let count = 0;
  for (const w of result.withdrawals) {
    if (w.status !== 'confirmed') continue;
    total += Number(w.amount) || 0;
    count += 1;
  }

  return { total: Math.round(total * 100) / 100, count };
}
