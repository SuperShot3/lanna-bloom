import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { Expense, ExpenseBillLine, ExpenseFilters } from '@/types/expenses';
import { expenseDocumentationComplete, parseExpenseBillTrackingJson } from '@/types/expenses';
import {
  billLinesNeedPersist,
  mergeBillTracking,
  resolveBillLinesTarget,
} from '@/lib/expenses/billTracking';

const TABLE = 'expenses';

export interface ExpensesResult {
  expenses: Expense[];
  total: number;
  totalAmount: number;
  /** Count of rows in the filtered set that are not fully documented (receipt + bill checklist when present). */
  missingReceiptCount: number;
  error?: string;
}

export async function getExpenses(
  filters: ExpenseFilters = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 30 }
): Promise<ExpensesResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { expenses: [], total: 0, totalAmount: 0, missingReceiptCount: 0, error: 'Supabase not configured' };
  }

  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const doc = filters.documentation;
  if (doc === 'incomplete' || doc === 'complete') {
    let q = supabase.from(TABLE).select('*');
    if (filters.dateFrom) q = q.gte('date', filters.dateFrom);
    if (filters.dateTo)   q = q.lte('date', filters.dateTo);
    if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category);
    if (filters.payment_method && filters.payment_method !== 'all') {
      q = q.eq('payment_method', filters.payment_method);
    }

    const { data, error } = await q
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[expenseQueries] getExpenses error:', error.message);
      return { expenses: [], total: 0, totalAmount: 0, missingReceiptCount: 0, error: error.message };
    }

    let rows = (data ?? []).map((row) => normalizeExpenseRow(row as Record<string, unknown>));
    if (doc === 'incomplete') {
      rows = rows.filter((e) => !expenseDocumentationComplete(e));
    } else {
      rows = rows.filter((e) => expenseDocumentationComplete(e));
    }
    if (filters.receipt === 'missing') {
      rows = rows.filter((e) => !e.receipt_attached);
    } else if (filters.receipt === 'attached') {
      rows = rows.filter((e) => e.receipt_attached);
    }

    const missingReceiptCount = rows.filter((e) => !expenseDocumentationComplete(e)).length;
    const totalAmount = rows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const total = rows.length;
    const pageRows = rows.slice(from, to + 1);

    return {
      expenses: pageRows,
      total,
      totalAmount,
      missingReceiptCount,
    };
  }

  let query = supabase.from(TABLE).select('*', { count: 'exact' });

  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo)   query = query.lte('date', filters.dateTo);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.payment_method && filters.payment_method !== 'all') {
    query = query.eq('payment_method', filters.payment_method);
  }
  if (filters.receipt === 'missing')  query = query.eq('receipt_attached', false);
  if (filters.receipt === 'attached') query = query.eq('receipt_attached', true);

  const { data, count, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[expenseQueries] getExpenses error:', error.message);
    return { expenses: [], total: 0, totalAmount: 0, missingReceiptCount: 0, error: error.message };
  }

  // Aggregate total amount + incomplete-documentation count for the full filtered set (not just the page).
  let aggregateQuery = supabase.from(TABLE).select('amount, receipt_attached, bill_tracking');
  if (filters.dateFrom) aggregateQuery = aggregateQuery.gte('date', filters.dateFrom);
  if (filters.dateTo)   aggregateQuery = aggregateQuery.lte('date', filters.dateTo);
  if (filters.category && filters.category !== 'all') {
    aggregateQuery = aggregateQuery.eq('category', filters.category);
  }
  if (filters.payment_method && filters.payment_method !== 'all') {
    aggregateQuery = aggregateQuery.eq('payment_method', filters.payment_method);
  }
  if (filters.receipt === 'missing')  aggregateQuery = aggregateQuery.eq('receipt_attached', false);
  if (filters.receipt === 'attached') aggregateQuery = aggregateQuery.eq('receipt_attached', true);

  const { data: amountRows } = await aggregateQuery;
  let totalAmount = 0;
  let missingReceiptCount = 0;
  for (const row of amountRows ?? []) {
    totalAmount += parseFloat(String(row.amount)) || 0;
    const lines = parseExpenseBillTrackingJson(row.bill_tracking);
    const e = {
      receipt_attached: row.receipt_attached === true,
      bill_tracking: lines,
    };
    if (!expenseDocumentationComplete(e)) missingReceiptCount++;
  }

  return {
    expenses: (data ?? []).map((row) => normalizeExpenseRow(row as Record<string, unknown>)),
    total: count ?? 0,
    totalAmount,
    missingReceiptCount,
  };
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[expenseQueries] getExpenseById error:', error.message);
    return null;
  }
  return normalizeExpenseRow(data);
}

function normalizeExpenseRow(data: Record<string, unknown>): Expense {
  const e = data as unknown as Expense;
  const parsed = parseExpenseBillTrackingJson(data.bill_tracking);
  if (parsed !== undefined) {
    e.bill_tracking = parsed;
  }
  return e;
}

/**
 * Sync `bill_tracking` with current order lines (new items, linked order, etc.)
 * and persist when line structure changed or was empty.
 */
export async function ensureBillTrackingUpToDate(expense: Expense): Promise<Expense> {
  const templates = await resolveBillLinesTarget(expense.linked_order_id);
  const merged = mergeBillTracking(expense.bill_tracking, templates);
  if (!billLinesNeedPersist(expense.bill_tracking, merged)) {
    return { ...expense, bill_tracking: merged };
  }
  const { expense: updated, error } = await updateExpense(expense.id, { bill_tracking: merged });
  if (error || !updated) {
    console.error('[expenseQueries] ensureBillTrackingUpToDate:', error);
    return { ...expense, bill_tracking: merged };
  }
  return updated;
}

export async function getCogsExpenseByOrderId(orderId: string): Promise<Expense | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('linked_order_id', orderId)
    .eq('category', 'flowers')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[expenseQueries] getCogsExpenseByOrderId error:', error.message);
    return null;
  }

  return (data as Expense | null) ?? null;
}

export interface CreateExpenseInput {
  amount: number;
  currency?: string;
  date: string;
  category: string;
  description: string;
  payment_method: string;
  receipt_file_path?: string | null;
  receipt_attached?: boolean;
  created_by: string;
  notes?: string | null;
  linked_order_id?: string | null;
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<{ expense: Expense | null; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { expense: null, error: 'Supabase not configured' };

  const templates = await resolveBillLinesTarget(input.linked_order_id ?? null);
  const bill_tracking = mergeBillTracking([], templates);

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      amount:            input.amount,
      currency:          input.currency ?? 'THB',
      date:              input.date,
      category:          input.category,
      description:       input.description,
      payment_method:    input.payment_method,
      receipt_file_path: input.receipt_file_path ?? null,
      receipt_attached:  input.receipt_attached ?? false,
      created_by:        input.created_by,
      notes:             input.notes ?? null,
      linked_order_id:   input.linked_order_id ?? null,
      bill_tracking,
    })
    .select()
    .single();

  if (error) {
    console.error('[expenseQueries] createExpense error:', error.message);
    return { expense: null, error: error.message };
  }
  return { expense: normalizeExpenseRow(data as Record<string, unknown>) };
}

export interface UpdateExpenseInput {
  receipt_file_path?: string | null;
  receipt_attached?: boolean;
  notes?: string | null;
  bill_tracking?: ExpenseBillLine[];
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput
): Promise<{ expense: Expense | null; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { expense: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[expenseQueries] updateExpense error:', error.message);
    return { expense: null, error: error.message };
  }
  return { expense: normalizeExpenseRow(data as Record<string, unknown>) };
}
