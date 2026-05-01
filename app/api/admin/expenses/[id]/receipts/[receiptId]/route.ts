import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenseById, updateExpense } from '@/lib/expenses/expenseQueries';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const BUCKET = 'receipts';

const LEGACY_PREFIX = 'legacy-';

function isLegacyReceiptId(receiptId: string, expenseId: string): boolean {
  return receiptId.startsWith(LEGACY_PREFIX) && receiptId.slice(LEGACY_PREFIX.length) === expenseId;
}

async function reconcileExpenseReceiptPointers(expenseId: string): Promise<string | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 'Storage not configured';

  const { data: rows, error } = await supabase
    .from('expense_receipt_images')
    .select('file_path')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: false });

  if (error) return error.message;

  const nextPath = rows?.[0]?.file_path != null ? String(rows[0].file_path) : null;
  const updated = await updateExpense(expenseId, {
    receipt_file_path: nextPath,
    receipt_attached: !!nextPath,
  });
  return updated.error;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; receiptId: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id: expenseIdRaw, receiptId: receiptIdRaw } = await params;
  const expenseId = expenseIdRaw?.trim();
  const receiptId = receiptIdRaw?.trim();
  if (!expenseId || !receiptId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const expense = await getExpenseById(expenseId);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  if (isLegacyReceiptId(receiptId, expenseId)) {
    const pathToRemove = expense.receipt_file_path;
    if (!pathToRemove) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([pathToRemove]);
    if (storageError) {
      console.error('[receipts DELETE] legacy storage remove:', storageError.message);
      return NextResponse.json({ error: 'Failed to remove file' }, { status: 500 });
    }
    const reconcileErr = await reconcileExpenseReceiptPointers(expenseId);
    if (reconcileErr) {
      return NextResponse.json({ error: reconcileErr }, { status: 500 });
    }
    const next = await getExpenseById(expenseId);
    return NextResponse.json({
      ok: true,
      receipt_attached: next?.receipt_attached ?? false,
      receipt_file_path: next?.receipt_file_path ?? null,
    });
  }

  const { data: row, error: fetchError } = await supabase
    .from('expense_receipt_images')
    .select('id, file_path')
    .eq('id', receiptId)
    .eq('expense_id', expenseId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!row?.file_path) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }

  const filePath = String(row.file_path);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (storageError) {
    console.error('[receipts DELETE] storage remove:', storageError.message);
    return NextResponse.json({ error: 'Failed to remove file' }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from('expense_receipt_images')
    .delete()
    .eq('id', receiptId)
    .eq('expense_id', expenseId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const reconcileErr = await reconcileExpenseReceiptPointers(expenseId);
  if (reconcileErr) {
    return NextResponse.json({ error: reconcileErr }, { status: 500 });
  }

  const next = await getExpenseById(expenseId);
  return NextResponse.json({
    ok: true,
    receipt_attached: next?.receipt_attached ?? false,
    receipt_file_path: next?.receipt_file_path ?? null,
  });
}
