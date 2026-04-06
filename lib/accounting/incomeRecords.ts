import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  IncomeRecord,
  IncomeFilters,
  IncomeSourceMode,
  IncomeSourceType,
  IncomePaymentMethod,
  MoneyLocation,
  IncomeStatus,
} from '@/types/accounting';

const TABLE = 'income_records';

// ─── List ─────────────────────────────────────────────────────────────────────

export interface IncomeListResult {
  records: IncomeRecord[];
  total: number;
  totalConfirmedAmount: number;
  totalPendingAmount: number;
  error?: string;
}

export async function getIncomeRecords(
  filters: IncomeFilters = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 30 }
): Promise<IncomeListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { records: [], total: 0, totalConfirmedAmount: 0, totalPendingAmount: 0, error: 'Supabase not configured' };
  }

  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(TABLE).select('*', { count: 'exact' });

  if (filters.dateFrom)     query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo)       query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.source_mode && filters.source_mode !== 'all')   query = query.eq('source_mode', filters.source_mode);
  if (filters.source_type && filters.source_type !== 'all')   query = query.eq('source_type', filters.source_type);
  if (filters.income_status && filters.income_status !== 'all') query = query.eq('income_status', filters.income_status);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[incomeRecords] list error:', error.message);
    return { records: [], total: 0, totalConfirmedAmount: 0, totalPendingAmount: 0, error: error.message };
  }

  // Total amount calculation over full filtered set
  let amountQuery = supabase.from(TABLE).select('amount, income_status').neq('income_status', 'cancelled');
  if (filters.dateFrom)   amountQuery = amountQuery.gte('created_at', filters.dateFrom);
  if (filters.dateTo)     amountQuery = amountQuery.lte('created_at', filters.dateTo + 'T23:59:59');
  if (filters.source_mode && filters.source_mode !== 'all') amountQuery = amountQuery.eq('source_mode', filters.source_mode);
  if (filters.source_type && filters.source_type !== 'all') amountQuery = amountQuery.eq('source_type', filters.source_type);

  const { data: amountRows } = await amountQuery;
  let totalConfirmedAmount = 0;
  let totalPendingAmount = 0;
  for (const row of amountRows ?? []) {
    const v = parseFloat(String(row.amount)) || 0;
    if (row.income_status === 'confirmed') totalConfirmedAmount += v;
    else totalPendingAmount += v;
  }

  return {
    records: (data ?? []) as IncomeRecord[],
    total: count ?? 0,
    totalConfirmedAmount,
    totalPendingAmount,
  };
}

// ─── Single record ────────────────────────────────────────────────────────────

export async function getIncomeRecordById(id: string): Promise<IncomeRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[incomeRecords] getById error:', error.message);
    return null;
  }
  return data as IncomeRecord;
}

// ─── Check for existing order_id ──────────────────────────────────────────────

export async function incomeExistsForOrder(orderId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('order_id', orderId)
    .single();

  return !!data;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateIncomeInput {
  order_id?: string | null;
  source_mode: IncomeSourceMode;
  source_type: IncomeSourceType;
  amount: number;
  currency?: string;
  payment_method: IncomePaymentMethod;
  money_location: MoneyLocation;
  income_status?: IncomeStatus;
  description: string;
  external_reference?: string | null;
  proof_file_path?: string | null;
  receipt_attached?: boolean;
  notes?: string | null;
  created_by: string;
}

export async function createIncomeRecord(
  input: CreateIncomeInput
): Promise<{ record: IncomeRecord | null; error?: string; duplicate?: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { record: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      order_id:          input.order_id ?? null,
      source_mode:       input.source_mode,
      source_type:       input.source_type,
      amount:            input.amount,
      currency:          input.currency ?? 'THB',
      payment_method:    input.payment_method,
      money_location:    input.money_location,
      income_status:     input.income_status ?? 'confirmed',
      description:       input.description,
      external_reference: input.external_reference ?? null,
      proof_file_path:   input.proof_file_path ?? null,
      receipt_attached:  input.receipt_attached ?? false,
      notes:             input.notes ?? null,
      created_by:        input.created_by,
      confirmed_at:      (input.income_status ?? 'confirmed') === 'confirmed' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { record: null, duplicate: true, error: 'Income record already exists for this order' };
    }
    console.error('[incomeRecords] createIncomeRecord error:', error.message);
    return { record: null, error: error.message };
  }

  return { record: data as IncomeRecord };
}

// ─── Upsert for auto-order (idempotent) ──────────────────────────────────────

export interface UpsertOrderIncomeInput {
  order_id: string;
  amount: number;
  currency?: string;
  payment_method: IncomePaymentMethod;
  money_location: MoneyLocation;
  description: string;
  external_reference?: string | null;
  created_by?: string;
}

/**
 * Idempotent: inserts a confirmed income record for an order.
 * If one already exists (by UNIQUE order_id), does nothing.
 * Never throws — safe to call fire-and-forget.
 */
export async function upsertOrderIncomeRecord(
  input: UpsertOrderIncomeInput
): Promise<{ created: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { created: false, error: 'Supabase not configured' };

  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from(TABLE).insert({
      order_id:          input.order_id,
      source_mode:       'auto_order',
      source_type:       'order',
      amount:            input.amount,
      currency:          input.currency ?? 'THB',
      payment_method:    input.payment_method,
      money_location:    input.money_location,
      income_status:     'confirmed',
      description:       input.description,
      external_reference: input.external_reference ?? null,
      proof_file_path:   null,
      receipt_attached:  false,
      notes:             null,
      created_by:        input.created_by ?? 'system',
      confirmed_at:      now,
    });

    if (error) {
      if (error.code === '23505') {
        return { created: false }; // Already exists — idempotent skip
      }
      console.error('[incomeRecords] upsertOrderIncomeRecord error:', error.message);
      return { created: false, error: error.message };
    }

    return { created: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[incomeRecords] upsertOrderIncomeRecord exception:', msg);
    return { created: false, error: msg };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateIncomeInput {
  income_status?: IncomeStatus;
  proof_file_path?: string | null;
  receipt_attached?: boolean;
  notes?: string | null;
}

export async function updateIncomeRecord(
  id: string,
  input: UpdateIncomeInput
): Promise<{ record: IncomeRecord | null; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { record: null, error: 'Supabase not configured' };

  const updatePayload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // Auto-set confirmed_at when status transitions to confirmed
  if (input.income_status === 'confirmed') {
    updatePayload.confirmed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[incomeRecords] updateIncomeRecord error:', error.message);
    return { record: null, error: error.message };
  }

  return { record: data as IncomeRecord };
}

// ─── Accounting overview aggregation ─────────────────────────────────────────

export interface OverviewPeriodFilter {
  dateFrom?: string;
  dateTo?: string;
}

export async function getAccountingOverview(filter: OverviewPeriodFilter = {}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  // Income: all non-cancelled records in period
  let incomeQuery = supabase.from(TABLE).select('amount, income_status, money_location');
  if (filter.dateFrom) incomeQuery = incomeQuery.gte('created_at', filter.dateFrom);
  if (filter.dateTo)   incomeQuery = incomeQuery.lte('created_at', filter.dateTo + 'T23:59:59');
  incomeQuery = incomeQuery.neq('income_status', 'cancelled');

  // Expenses in period
  let expenseQuery = supabase.from('expenses').select('amount');
  if (filter.dateFrom) expenseQuery = expenseQuery.gte('date', filter.dateFrom?.slice(0, 10));
  if (filter.dateTo)   expenseQuery = expenseQuery.lte('date', filter.dateTo?.slice(0, 10));

  const [{ data: incomeRows }, { data: expenseRows }] = await Promise.all([
    incomeQuery,
    expenseQuery,
  ]);

  let totalIncome = 0;
  let confirmedIncome = 0;
  let pendingIncome = 0;
  const locationMap: Record<string, number> = {};

  for (const row of incomeRows ?? []) {
    const v = parseFloat(String(row.amount)) || 0;
    totalIncome += v;
    if (row.income_status === 'confirmed') {
      confirmedIncome += v;
      const loc = String(row.money_location ?? 'other');
      locationMap[loc] = (locationMap[loc] ?? 0) + v;
    } else {
      pendingIncome += v;
    }
  }

  const totalExpenses = (expenseRows ?? []).reduce(
    (sum, row) => sum + (parseFloat(String(row.amount)) || 0),
    0
  );

  return {
    totalIncome,
    confirmedIncome,
    pendingIncome,
    totalExpenses,
    netResult: confirmedIncome - totalExpenses,
    incomeByLocation: Object.entries(locationMap).map(([location, total]) => ({ location, total })),
    incomeCount: (incomeRows ?? []).length,
    expenseCount: (expenseRows ?? []).length,
    currency: 'THB',
  };
}
