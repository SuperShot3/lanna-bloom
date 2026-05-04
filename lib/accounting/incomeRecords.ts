import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { netAfterProcessingFee, processingFeeForIncome } from '@/lib/accounting/stripeFee';
import {
  incomeDocumentationComplete,
  type IncomeRecord,
  type IncomeFilters,
  type IncomeSourceMode,
  type IncomeSourceType,
  type IncomePaymentMethod,
  type MoneyLocation,
  type IncomeStatus,
} from '@/types/accounting';
import { expenseDocumentationComplete, parseExpenseBillTrackingJson } from '@/types/expenses';
import { getRefundsTotalInPeriod } from '@/lib/accounting/incomeRefunds';

const TABLE = 'income_records';

const COGS_EXPENSE_CATEGORIES = new Set(['flowers', 'delivery']);

// ─── List ─────────────────────────────────────────────────────────────────────

export interface IncomeListResult {
  records: IncomeRecord[];
  total: number;
  /** Confirmed rows: gross sum */
  totalConfirmedAmount: number;
  /** Confirmed Stripe rows only: sum of processing_fee_amount */
  totalConfirmedStripeFees: number;
  /** Confirmed rows: gross minus processing fees */
  totalConfirmedNetAmount: number;
  totalPendingAmount: number;
  /** Count of rows in the filtered set that still need an uploaded proof (non-Stripe only). */
  missingProofCount: number;
  error?: string;
}

export async function getIncomeRecords(
  filters: IncomeFilters = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 30 }
): Promise<IncomeListResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      records: [],
      total: 0,
      totalConfirmedAmount: 0,
      totalConfirmedStripeFees: 0,
      totalConfirmedNetAmount: 0,
      totalPendingAmount: 0,
      missingProofCount: 0,
      error: 'Supabase not configured',
    };
  }

  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(TABLE).select('*', { count: 'exact' });

  // Period filter uses paid_date (the day money actually arrived) so monthly
  // totals line up with expense `date`. Falls back transparently for legacy
  // rows because the migration backfills paid_date from created_at.
  if (filters.dateFrom)     query = query.gte('paid_date', filters.dateFrom.slice(0, 10));
  if (filters.dateTo)       query = query.lte('paid_date', filters.dateTo.slice(0, 10));
  if (filters.source_mode && filters.source_mode !== 'all')   query = query.eq('source_mode', filters.source_mode);
  if (filters.source_type && filters.source_type !== 'all')   query = query.eq('source_type', filters.source_type);
  if (filters.income_status && filters.income_status !== 'all') query = query.eq('income_status', filters.income_status);
  if (filters.receipt === 'missing') {
    query = query.neq('payment_method', 'stripe').eq('receipt_attached', false);
  }
  if (filters.receipt === 'attached') {
    query = query.or('payment_method.eq.stripe,receipt_attached.eq.true');
  }

  const { data, count, error } = await query
    .order('paid_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[incomeRecords] list error:', error.message);
    return {
      records: [],
      total: 0,
      totalConfirmedAmount: 0,
      totalConfirmedStripeFees: 0,
      totalConfirmedNetAmount: 0,
      totalPendingAmount: 0,
      missingProofCount: 0,
      error: error.message,
    };
  }

  // Aggregate amount totals + missing-proof count over the full filtered set.
  let amountQuery = supabase
    .from(TABLE)
    .select('amount, income_status, payment_method, processing_fee_amount, receipt_attached')
    .neq('income_status', 'cancelled');
  if (filters.dateFrom)   amountQuery = amountQuery.gte('paid_date', filters.dateFrom.slice(0, 10));
  if (filters.dateTo)     amountQuery = amountQuery.lte('paid_date', filters.dateTo.slice(0, 10));
  if (filters.source_mode && filters.source_mode !== 'all') amountQuery = amountQuery.eq('source_mode', filters.source_mode);
  if (filters.source_type && filters.source_type !== 'all') amountQuery = amountQuery.eq('source_type', filters.source_type);
  if (filters.receipt === 'missing') {
    amountQuery = amountQuery.neq('payment_method', 'stripe').eq('receipt_attached', false);
  }
  if (filters.receipt === 'attached') {
    amountQuery = amountQuery.or('payment_method.eq.stripe,receipt_attached.eq.true');
  }

  const { data: amountRows } = await amountQuery;
  let totalConfirmedAmount = 0;
  let totalConfirmedStripeFees = 0;
  let totalConfirmedNetAmount = 0;
  let totalPendingAmount = 0;
  let missingProofCount = 0;
  for (const row of amountRows ?? []) {
    const gross = parseFloat(String(row.amount)) || 0;
    const feeRaw = row.processing_fee_amount;
    const fee =
      feeRaw != null && feeRaw !== ''
        ? parseFloat(String(feeRaw)) || 0
        : processingFeeForIncome(gross, row.payment_method as IncomePaymentMethod);
    if (row.income_status === 'confirmed') {
      totalConfirmedAmount += gross;
      totalConfirmedStripeFees += fee;
      totalConfirmedNetAmount += netAfterProcessingFee(gross, fee);
    } else {
      totalPendingAmount += gross;
    }
    if (
      !incomeDocumentationComplete({
        payment_method: row.payment_method as IncomePaymentMethod,
        receipt_attached: row.receipt_attached === true,
        income_status: row.income_status as IncomeStatus,
      })
    ) {
      missingProofCount++;
    }
  }

  return {
    records: (data ?? []) as IncomeRecord[],
    total: count ?? 0,
    totalConfirmedAmount,
    totalConfirmedStripeFees,
    totalConfirmedNetAmount,
    totalPendingAmount,
    missingProofCount,
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

/**
 * Hard-delete the income record linked to an order (e.g. when the order is deleted).
 * Safe to call even if no income record exists — silently does nothing in that case.
 */
export async function cancelIncomeForOrder(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase
    .from(TABLE)
    .delete()
    .eq('order_id', orderId);
}

/**
 * Hard-delete a single income record by its UUID.
 * Returns true on success, false if not found or on error.
 */
export async function deleteIncomeRecord(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  return !error;
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
  /** YYYY-MM-DD — when the money actually arrived. Defaults to today on the DB side. */
  paid_date?: string | null;
  created_by: string;
}

export async function createIncomeRecord(
  input: CreateIncomeInput
): Promise<{ record: IncomeRecord | null; error?: string; duplicate?: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { record: null, error: 'Supabase not configured' };

  const fee = processingFeeForIncome(input.amount, input.payment_method);

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      order_id:          input.order_id ?? null,
      source_mode:       input.source_mode,
      source_type:       input.source_type,
      amount:            input.amount,
      processing_fee_amount: fee,
      currency:          input.currency ?? 'THB',
      payment_method:    input.payment_method,
      money_location:    input.money_location,
      income_status:     input.income_status ?? 'confirmed',
      description:       input.description,
      external_reference: input.external_reference ?? null,
      proof_file_path:   input.proof_file_path ?? null,
      receipt_attached:  input.receipt_attached ?? false,
      notes:             input.notes ?? null,
      paid_date:         input.paid_date ?? undefined, // let DB default fire when omitted
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
  /** YYYY-MM-DD — when the order was paid. Defaults to today if omitted. */
  paid_date?: string | null;
  /**
   * When set (including 0), stored on `processing_fee_amount` instead of the estimated % from {@link processingFeeForIncome}.
   * Populated from Stripe `balance_transaction.fee` for Stripe checkouts when available.
   */
  processing_fee_amount?: number | null;
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
    const hasFeeOverride =
      input.processing_fee_amount != null && Number.isFinite(Number(input.processing_fee_amount));
    const fee = hasFeeOverride
      ? Math.max(0, Number(input.processing_fee_amount))
      : processingFeeForIncome(input.amount, input.payment_method);
    const { error } = await supabase.from(TABLE).insert({
      order_id:          input.order_id,
      source_mode:       'auto_order',
      source_type:       'order',
      amount:            input.amount,
      processing_fee_amount: fee,
      currency:          input.currency ?? 'THB',
      payment_method:    input.payment_method,
      money_location:    input.money_location,
      income_status:     'confirmed',
      description:       input.description,
      external_reference: input.external_reference ?? null,
      proof_file_path:   null,
      receipt_attached:  false,
      notes:             null,
      paid_date:         input.paid_date ?? undefined,
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
  money_location?: MoneyLocation;
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

  const effectiveIncomeLocation = (row: {
    payment_method?: unknown;
    money_location?: unknown;
  }): string => {
    const pm = String(row.payment_method ?? '');
    // Stripe money is locked in Stripe until a payout (transfer) moves it.
    if (pm === 'stripe') return 'stripe';
    // Cash payments land in cash.
    if (pm === 'cash') return 'cash';
    // Bank/QR settle to the bank account.
    if (pm === 'bank_transfer' || pm === 'qr_payment') return 'bank';
    // Fall back to explicit money_location for manual/other income.
    const loc = String(row.money_location ?? 'other');
    return loc || 'other';
  };

  // Income: all non-cancelled records in period (filtered by paid_date so it
  // matches expense `date` and "real income this month" is accurate).
  let incomeQuery = supabase
    .from(TABLE)
    .select('amount, income_status, money_location, payment_method, processing_fee_amount, receipt_attached');
  if (filter.dateFrom) incomeQuery = incomeQuery.gte('paid_date', filter.dateFrom.slice(0, 10));
  if (filter.dateTo)   incomeQuery = incomeQuery.lte('paid_date', filter.dateTo.slice(0, 10));
  incomeQuery = incomeQuery.neq('income_status', 'cancelled');

  // Expenses in period — payment_method (location), receipt + bill_tracking (documentation KPI).
  let expenseQuery = supabase
    .from('expenses')
    .select('amount, payment_method, receipt_attached, bill_tracking, category');
  if (filter.dateFrom) expenseQuery = expenseQuery.gte('date', filter.dateFrom?.slice(0, 10));
  if (filter.dateTo)   expenseQuery = expenseQuery.lte('date', filter.dateTo?.slice(0, 10));

  const [{ data: incomeRows }, { data: expenseRows }, { data: transferRows }, totalRefunds] =
    await Promise.all([
    incomeQuery,
    expenseQuery,
    supabase
      .from('accounting_transfers')
      .select('amount, from_location, to_location, status')
      .gte('transfer_date', filter.dateFrom?.slice(0, 10) ?? '0001-01-01')
      .lte('transfer_date', filter.dateTo?.slice(0, 10) ?? '9999-12-31'),
    getRefundsTotalInPeriod(filter),
  ]);

  let totalIncome = 0;
  let confirmedIncome = 0;
  let stripeProcessingFees = 0;
  let confirmedIncomeNet = 0;
  let pendingIncome = 0;
  let incomeMissingProofCount = 0;
  const locationGross: Record<string, number> = {};
  const locationNet: Record<string, number> = {};

  for (const row of incomeRows ?? []) {
    const gross = parseFloat(String(row.amount)) || 0;
    const pm = row.payment_method as IncomePaymentMethod;
    const feeStored = row.processing_fee_amount;
    const fee =
      feeStored != null && String(feeStored) !== ''
        ? parseFloat(String(feeStored)) || 0
        : processingFeeForIncome(gross, pm);
    totalIncome += gross;
    if (row.income_status === 'confirmed') {
      confirmedIncome += gross;
      stripeProcessingFees += fee;
      const net = netAfterProcessingFee(gross, fee);
      confirmedIncomeNet += net;
      const loc = effectiveIncomeLocation(row);
      locationGross[loc] = (locationGross[loc] ?? 0) + gross;
      locationNet[loc] = (locationNet[loc] ?? 0) + net;
    } else {
      pendingIncome += gross;
    }
    if (
      !incomeDocumentationComplete({
        payment_method: row.payment_method as IncomePaymentMethod,
        receipt_attached: row.receipt_attached === true,
        income_status: row.income_status as IncomeStatus,
      })
    ) {
      incomeMissingProofCount++;
    }
  }

  // Map each expense to the money_location it actually came out of.
  // Expense payment_method → income money_location:
  //   cash         → cash  (paid from petty cash)
  //   bank_transfer → bank  (paid from bank account)
  //   card          → bank  (business debit/credit card = bank funds)
  //   qr_payment    → bank  (PromptPay settles to bank account)
  //   other / unknown → other
  const expensesByLocation: Record<string, number> = {};
  let expensesMissingReceiptCount = 0;
  let cogsSubtotal = 0;
  let operatingExpensesSubtotal = 0;
  for (const row of expenseRows ?? []) {
    const amount = parseFloat(String(row.amount)) || 0;
    const cat = String((row as { category?: unknown }).category ?? 'other');
    if (COGS_EXPENSE_CATEGORIES.has(cat)) {
      cogsSubtotal += amount;
    } else {
      operatingExpensesSubtotal += amount;
    }
    const pm = String(row.payment_method ?? 'other');
    const loc =
      pm === 'cash'          ? 'cash'  :
      pm === 'bank_transfer' ? 'bank'  :
      pm === 'card'          ? 'bank'  :
      pm === 'qr_payment'    ? 'bank'  :
      // For this project we treat any unknown/legacy expense method as bank.
      // Stripe balance is locked and cannot be spent from, so expenses must reduce bank or cash.
      'bank';
    expensesByLocation[loc] = (expensesByLocation[loc] ?? 0) + amount;
    const lines = parseExpenseBillTrackingJson(row.bill_tracking);
    if (
      !expenseDocumentationComplete({
        receipt_attached: row.receipt_attached === true,
        bill_tracking: lines,
      })
    ) {
      expensesMissingReceiptCount++;
    }
  }

  const totalExpenses = Object.values(expensesByLocation).reduce((s, v) => s + v, 0);

  const confirmedIncomeNetAfterRefunds = Math.round((confirmedIncomeNet - totalRefunds) * 100) / 100;
  const grossProfit = Math.round((confirmedIncomeNetAfterRefunds - cogsSubtotal) * 100) / 100;
  const netResult = Math.round((confirmedIncomeNetAfterRefunds - totalExpenses) * 100) / 100;

  const transferNetByLocation: Record<string, number> = {};
  for (const t of transferRows ?? []) {
    const status = String(t.status ?? 'received');
    if (status !== 'received' && status !== 'reconciled') continue;
    const amt = parseFloat(String(t.amount)) || 0;
    const from = String(t.from_location ?? '').trim().toLowerCase();
    const to = String(t.to_location ?? '').trim().toLowerCase();
    if (!amt || !from || !to) continue;
    transferNetByLocation[from] = (transferNetByLocation[from] ?? 0) - amt;
    transferNetByLocation[to] = (transferNetByLocation[to] ?? 0) + amt;
  }

  const locationKeys = new Set([
    ...Object.keys(locationNet),
    ...Object.keys(locationGross),
    ...Object.keys(expensesByLocation),
    ...Object.keys(transferNetByLocation),
  ]);

  const incomeByLocation = Array.from(locationKeys).map((location) => {
    const netAfterFees = locationNet[location] ?? 0;
    const grossTotal = locationGross[location] ?? 0;
    const allocatedExpenses = expensesByLocation[location] ?? 0;
    const transfersNet = transferNetByLocation[location] ?? 0;
    const netAfterFeesAndExpenses = netAfterFees - allocatedExpenses + transfersNet;
    return {
      location,
      grossTotal,
      netAfterFees,
      allocatedExpenses,
      transfersNet,
      netAfterFeesAndExpenses,
    };
  });

  return {
    totalIncome,
    confirmedIncome,
    stripeProcessingFees,
    confirmedIncomeNet,
    totalRefunds,
    confirmedIncomeNetAfterRefunds,
    cogsSubtotal,
    operatingExpensesSubtotal,
    grossProfit,
    pendingIncome,
    totalExpenses,
    netResult,
    incomeByLocation,
    incomeCount: (incomeRows ?? []).length,
    expenseCount: (expenseRows ?? []).length,
    expensesMissingReceiptCount,
    incomeMissingProofCount,
    currency: 'THB',
  };
}
