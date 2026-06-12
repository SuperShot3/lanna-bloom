import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  deleteAccountingWithdrawal,
  getAccountingWithdrawalById,
  updateAccountingWithdrawal,
  validateWithdrawalPurpose,
} from '@/lib/accounting/withdrawals';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const withdrawal = await getAccountingWithdrawalById(id.trim());
  if (!withdrawal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ withdrawal });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

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
  const patch: Parameters<typeof updateAccountingWithdrawal>[1] = {};

  if (b.amount !== undefined) {
    const amountRaw = b.amount;
    const amount =
      typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw ?? ''));
    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    patch.amount = amount;
  }

  if (b.withdrawal_date !== undefined) {
    const withdrawal_date = typeof b.withdrawal_date === 'string' ? b.withdrawal_date.trim() : '';
    if (!withdrawal_date || !/^\d{4}-\d{2}-\d{2}$/.test(withdrawal_date)) {
      return NextResponse.json({ error: 'withdrawal_date must be in YYYY-MM-DD format' }, { status: 400 });
    }
    patch.withdrawal_date = withdrawal_date;
  }

  if (b.purpose !== undefined) {
    const purpose = typeof b.purpose === 'string' ? b.purpose : '';
    const purposeErr = validateWithdrawalPurpose(purpose);
    if (purposeErr) return NextResponse.json({ error: purposeErr }, { status: 400 });
    patch.purpose = purpose;
  }

  if (b.notes !== undefined) {
    patch.notes = typeof b.notes === 'string' ? b.notes.trim() || null : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const result = await updateAccountingWithdrawal(id.trim(), patch);
  if (result.error || !result.withdrawal) {
    return NextResponse.json({ error: result.error ?? 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ withdrawal: result.withdrawal });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const existing = await getAccountingWithdrawalById(id.trim());
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await deleteAccountingWithdrawal(id.trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
