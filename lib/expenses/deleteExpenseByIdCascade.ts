import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Delete one expense row and best-effort remove receipt files from Storage.
 * Mirrors `DELETE /api/admin/expenses/[id]`.
 */
export async function deleteExpenseByIdCascade(
  supabase: SupabaseClient,
  expenseId: string
): Promise<{ error?: string; notFound?: boolean }> {
  const { data: existing, error: fetchErr } = await supabase
    .from('expenses')
    .select('receipt_file_path')
    .eq('id', expenseId)
    .maybeSingle();

  if (fetchErr) {
    return { error: fetchErr.message };
  }
  if (!existing) {
    return { notFound: true };
  }

  const { data: receiptRows } = await supabase
    .from('expense_receipt_images')
    .select('file_path')
    .eq('expense_id', expenseId);

  const { error: delErr } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (delErr) {
    return { error: delErr.message };
  }

  const receiptPaths = new Set<string>();
  const legacy = typeof existing.receipt_file_path === 'string' ? existing.receipt_file_path.trim() : '';
  if (legacy) receiptPaths.add(legacy);
  for (const row of receiptRows ?? []) {
    const p = typeof row.file_path === 'string' ? row.file_path : '';
    if (p.trim()) receiptPaths.add(p.trim());
  }

  if (receiptPaths.size > 0) {
    const { error: storageError } = await supabase.storage
      .from('receipts')
      .remove(Array.from(receiptPaths));
    if (storageError) {
      console.error('[expenses] receipt cleanup error:', storageError.message);
    }
  }

  return {};
}
