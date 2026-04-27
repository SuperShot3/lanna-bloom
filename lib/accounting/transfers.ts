import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { AccountingTransfer, AccountingTransferStatus } from '@/types/accountingTransfers';

const TABLE = 'accounting_transfers';

export interface CreateTransferInput {
  amount: number;
  currency?: string;
  transfer_date: string;
  from_location: string;
  to_location: string;
  status?: AccountingTransferStatus;
  external_reference?: string | null;
  bank_received_date?: string | null;
  attachment_file_path?: string | null;
  attachment_attached?: boolean;
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
      status: input.status ?? 'received',
      external_reference: input.external_reference ?? null,
      bank_received_date: input.bank_received_date ?? null,
      attachment_file_path: input.attachment_file_path ?? null,
      attachment_attached: input.attachment_attached ?? false,
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

export async function getAccountingTransferById(id: string): Promise<AccountingTransfer | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[transfers] getAccountingTransferById error:', error.message);
    return null;
  }

  return data as AccountingTransfer;
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

