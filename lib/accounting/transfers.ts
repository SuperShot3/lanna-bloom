import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { AccountingTransfer } from '@/types/accountingTransfers';

const TABLE = 'accounting_transfers';

export interface CreateTransferInput {
  amount: number;
  currency?: string;
  transfer_date: string;
  from_location: string;
  to_location: string;
  note?: string | null;
  created_by: string;
}

export async function createAccountingTransfer(
  input: CreateTransferInput
): Promise<{ transfer: AccountingTransfer | null; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { transfer: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      amount: input.amount,
      currency: input.currency ?? 'THB',
      transfer_date: input.transfer_date,
      from_location: input.from_location,
      to_location: input.to_location,
      note: input.note ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    console.error('[transfers] createAccountingTransfer error:', error.message);
    return { transfer: null, error: error.message };
  }

  return { transfer: data as AccountingTransfer };
}

export async function getAccountingTransfers(
  filter: { dateFrom?: string; dateTo?: string } = {}
): Promise<{ transfers: AccountingTransfer[]; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { transfers: [], error: 'Supabase not configured' };

  let q = supabase.from(TABLE).select('*');
  if (filter.dateFrom) q = q.gte('transfer_date', filter.dateFrom.slice(0, 10));
  if (filter.dateTo) q = q.lte('transfer_date', filter.dateTo.slice(0, 10));

  const { data, error } = await q
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[transfers] getAccountingTransfers error:', error.message);
    return { transfers: [], error: error.message };
  }
  return { transfers: (data ?? []) as AccountingTransfer[] };
}

