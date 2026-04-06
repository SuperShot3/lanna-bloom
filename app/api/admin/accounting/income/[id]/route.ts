import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getIncomeRecordById, updateIncomeRecord, deleteIncomeRecord } from '@/lib/accounting/incomeRecords';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const record = await getIncomeRecordById(id.trim());
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ record });
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
  const updateInput: Parameters<typeof updateIncomeRecord>[1] = {};

  if ('income_status' in b) {
    const s = String(b.income_status ?? '');
    if (!['confirmed', 'pending', 'cancelled'].includes(s)) {
      return NextResponse.json({ error: 'Invalid income_status' }, { status: 400 });
    }
    updateInput.income_status = s as 'confirmed' | 'pending' | 'cancelled';
  }
  if ('proof_file_path' in b) {
    updateInput.proof_file_path =
      typeof b.proof_file_path === 'string' ? b.proof_file_path.trim() || null : null;
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

  const { record, error } = await updateIncomeRecord(id.trim(), updateInput);
  if (error || !record) {
    return NextResponse.json({ error: error ?? 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ record });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const ok = await deleteIncomeRecord(id.trim());
  if (!ok) return NextResponse.json({ error: 'Not found or delete failed' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
