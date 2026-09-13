import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ExpenseFilters } from '@/types/expenses';
import { expenseDocumentationComplete, parseExpenseBillTrackingJson } from '@/types/expenses';

const TABLE = 'expense_categories';

export interface ExpenseCategoryRow {
  id: string;
  value: string;
  label: string;
  color: string;
  is_cogs: boolean;
  is_system: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Record<string, unknown>): ExpenseCategoryRow {
  return {
    id: String(row.id),
    value: String(row.value),
    label: String(row.label),
    color: String(row.color),
    is_cogs: Boolean(row.is_cogs),
    is_system: Boolean(row.is_system),
    active: Boolean(row.active),
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function listExpenseCategories(
  opts: { activeOnly?: boolean } = {}
): Promise<{ ok: true; categories: ExpenseCategoryRow[] } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  let query = supabase.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (opts.activeOnly) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) {
    console.error('[expenseCategoryQueries] listExpenseCategories failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, categories: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
}

export async function getExpenseCategoryByValue(
  value: string
): Promise<{ ok: true; category: ExpenseCategoryRow } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const { data, error } = await supabase.from(TABLE).select('*').eq('value', value).maybeSingle();
  if (error) {
    console.error('[expenseCategoryQueries] getExpenseCategoryByValue failed:', error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'Not found' };
  return { ok: true, category: mapRow(data as Record<string, unknown>) };
}

export interface CreateExpenseCategoryInput {
  label: string;
  color: string;
  is_cogs: boolean;
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput
): Promise<{ ok: true; category: ExpenseCategoryRow } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const label = input.label.trim();
  if (!label) return { ok: false, error: 'Name is required' };
  const value = slugify(label);
  if (!value) return { ok: false, error: 'Name must include at least one letter or number' };

  const { data: existing, error: lookupError } = await supabase
    .from(TABLE)
    .select('id')
    .eq('value', value)
    .maybeSingle();
  if (lookupError) {
    console.error('[expenseCategoryQueries] createExpenseCategory lookup failed:', lookupError.message);
    return { ok: false, error: lookupError.message };
  }
  if (existing) return { ok: false, error: 'A category with a similar name already exists' };

  const { data: maxRow } = await supabase
    .from(TABLE)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (typeof maxRow?.sort_order === 'number' ? maxRow.sort_order : 0) + 1;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      value,
      label,
      color: input.color,
      is_cogs: input.is_cogs,
      is_system: false,
      active: true,
      sort_order,
    })
    .select()
    .single();

  if (error) {
    console.error('[expenseCategoryQueries] createExpenseCategory failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, category: mapRow(data as Record<string, unknown>) };
}

export interface UpdateExpenseCategoryInput {
  label?: string;
  color?: string;
  is_cogs?: boolean;
  active?: boolean;
}

export async function updateExpenseCategory(
  value: string,
  patch: UpdateExpenseCategoryInput
): Promise<{ ok: true; category: ExpenseCategoryRow } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  if (patch.active === false) {
    const existing = await getExpenseCategoryByValue(value);
    if (!existing.ok) return existing;
    if (existing.category.is_system) {
      return { ok: false, error: 'System categories cannot be archived' };
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (!label) return { ok: false, error: 'Name is required' };
    update.label = label;
  }
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.is_cogs !== undefined) update.is_cogs = patch.is_cogs;
  if (patch.active !== undefined) update.active = patch.active;

  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq('value', value)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[expenseCategoryQueries] updateExpenseCategory failed:', error.message);
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: 'Not found' };
  return { ok: true, category: mapRow(data as Record<string, unknown>) };
}

export interface ExpenseCategoryTotal {
  value: string;
  label: string;
  color: string;
  is_cogs: boolean;
  total: number;
  count: number;
  percent: number;
}

export async function getExpenseCategoryTotals(
  filters: Pick<ExpenseFilters, 'dateFrom' | 'dateTo' | 'payment_method' | 'receipt' | 'documentation'>
): Promise<{ ok: true; totals: ExpenseCategoryTotal[]; grandTotal: number } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const needsDocFilter = filters.documentation === 'incomplete' || filters.documentation === 'complete';
  let query = supabase.from('expenses').select('category, amount, receipt_attached, bill_tracking');

  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);
  if (filters.payment_method && filters.payment_method !== 'all') {
    query = query.eq('payment_method', filters.payment_method);
  }
  if (filters.receipt === 'missing') query = query.eq('receipt_attached', false);
  if (filters.receipt === 'attached') query = query.eq('receipt_attached', true);

  const { data, error } = await query;
  if (error) {
    console.error('[expenseCategoryQueries] getExpenseCategoryTotals failed:', error.message);
    return { ok: false, error: error.message };
  }

  type Row = { category: string; amount: unknown; receipt_attached?: unknown; bill_tracking?: unknown };
  let rows = (data ?? []) as Row[];
  if (needsDocFilter) {
    rows = rows.filter((row) => {
      const complete = expenseDocumentationComplete({
        receipt_attached: row.receipt_attached === true,
        bill_tracking: parseExpenseBillTrackingJson(row.bill_tracking),
      });
      return filters.documentation === 'complete' ? complete : !complete;
    });
  }

  const sums = new Map<string, { total: number; count: number }>();
  let grandTotal = 0;
  for (const row of rows) {
    const amount = parseFloat(String(row.amount)) || 0;
    const bucket = sums.get(row.category) ?? { total: 0, count: 0 };
    bucket.total += amount;
    bucket.count += 1;
    sums.set(row.category, bucket);
    grandTotal += amount;
  }

  const categoriesResult = await listExpenseCategories();
  const categoryMeta = categoriesResult.ok ? categoriesResult.categories : [];
  const metaByValue = new Map(categoryMeta.map((c) => [c.value, c]));

  const totals: ExpenseCategoryTotal[] = Array.from(sums.entries()).map(([value, { total, count }]) => {
    const meta = metaByValue.get(value);
    return {
      value,
      label: meta?.label ?? value,
      color: meta?.color ?? '#94A3B8',
      is_cogs: meta?.is_cogs ?? false,
      total,
      count,
      percent: grandTotal > 0 ? total / grandTotal : 0,
    };
  });
  totals.sort((a, b) => b.total - a.total);

  return { ok: true, totals, grandTotal };
}
