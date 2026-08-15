import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getIncomeRecordById, updateIncomeRecord, deleteIncomeRecord } from '@/lib/accounting/incomeRecords';
import { MONEY_LOCATIONS } from '@/types/accounting';

const VALID_MONEY_LOCATIONS = MONEY_LOCATIONS.map((x) => x.value);

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

  const existing = await getIncomeRecordById(id.trim());
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
  if ('money_location' in b) {
    const loc = typeof b.money_location === 'string' ? b.money_location.trim() : '';
    if (!VALID_MONEY_LOCATIONS.includes(loc as never)) {
      return NextResponse.json(
        { error: `money_location must be one of: ${VALID_MONEY_LOCATIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (existing.payment_method === 'stripe' && loc !== 'stripe') {
      return NextResponse.json(
        { error: 'Stripe income stays in the Stripe bucket until payout' },
        { status: 400 }
      );
    }
    updateInput.money_location = loc as never;
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
  if ('processing_fee_amount' in b) {
    if (existing.payment_method !== 'stripe') {
      return NextResponse.json(
        { error: 'processing_fee_amount can only be set on Stripe income' },
        { status: 400 }
      );
    }
    const feeRaw =
      typeof b.processing_fee_amount === 'number'
        ? b.processing_fee_amount
        : parseFloat(String(b.processing_fee_amount ?? ''));
    if (!Number.isFinite(feeRaw) || feeRaw < 0) {
      return NextResponse.json({ error: 'processing_fee_amount must be a number ≥ 0' }, { status: 400 });
    }
    updateInput.processing_fee_amount = Math.round(feeRaw * 100) / 100;
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
