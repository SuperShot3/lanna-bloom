import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenseById, updateExpense } from '@/lib/expenses/expenseQueries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const expense = await getExpenseById(id.trim());
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  return NextResponse.json({ expense });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updateInput: Parameters<typeof updateExpense>[1] = {};

  if ('receipt_file_path' in b) {
    updateInput.receipt_file_path =
      typeof b.receipt_file_path === 'string' ? b.receipt_file_path.trim() || null : null;
  }
  if ('receipt_attached' in b) {
    updateInput.receipt_attached = b.receipt_attached === true;
  }
  if ('notes' in b) {
    updateInput.notes = typeof b.notes === 'string' ? b.notes.trim() || null : null;
  }

  if (Object.keys(updateInput).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { expense, error } = await updateExpense(id.trim(), updateInput);
  if (error || !expense) {
    return NextResponse.json({ error: error ?? 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ expense });
}
