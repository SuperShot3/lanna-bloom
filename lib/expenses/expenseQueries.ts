import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { Expense, ExpenseFilters } from '@/types/expenses';

const TABLE = 'expenses';

export interface ExpensesResult {
  expenses: Expense[];
  total: number;
  totalAmount: number;
  error?: string;
}

export async function getExpenses(
  filters: ExpenseFilters = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 30 }
): Promise<ExpensesResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { expenses: [], total: 0, totalAmount: 0, error: 'Supabase not configured' };
  }

  const { page, pageSize } = pagination;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(TABLE).select('*', { count: 'exact' });

  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo)   query = query.lte('date', filters.dateTo);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.payment_method && filters.payment_method !== 'all') {
    query = query.eq('payment_method', filters.payment_method);
  }

  const { data, count, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[expenseQueries] getExpenses error:', error.message);
    return { expenses: [], total: 0, totalAmount: 0, error: error.message };
  }

  // Calculate total amount for the full filtered set (not just the page)
  let totalAmountQuery = supabase.from(TABLE).select('amount');
  if (filters.dateFrom) totalAmountQuery = totalAmountQuery.gte('date', filters.dateFrom);
  if (filters.dateTo)   totalAmountQuery = totalAmountQuery.lte('date', filters.dateTo);
  if (filters.category && filters.category !== 'all') {
    totalAmountQuery = totalAmountQuery.eq('category', filters.category);
  }
  if (filters.payment_method && filters.payment_method !== 'all') {
    totalAmountQuery = totalAmountQuery.eq('payment_method', filters.payment_method);
  }

  const { data: amountRows } = await totalAmountQuery;
  const totalAmount = (amountRows ?? []).reduce(
    (sum, row) => sum + (parseFloat(String(row.amount)) || 0),
    0
  );

  return {
    expenses: (data ?? []) as Expense[],
    total: count ?? 0,
    totalAmount,
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
  return data as Expense;
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
    })
    .select()
    .single();

  if (error) {
    console.error('[expenseQueries] createExpense error:', error.message);
    return { expense: null, error: error.message };
  }
  return { expense: data as Expense };
}

export interface UpdateExpenseInput {
  receipt_file_path?: string | null;
  receipt_attached?: boolean;
  notes?: string | null;
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
  return { expense: data as Expense };
}
