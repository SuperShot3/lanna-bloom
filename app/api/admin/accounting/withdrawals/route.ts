import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { MONEY_LOCATIONS } from '@/types/accounting';
import {
  createAccountingWithdrawal,
  getAccountingWithdrawals,
  sumWithdrawalsInRange,
  validateWithdrawalPurpose,
} from '@/lib/accounting/withdrawals';

const VALID_MONEY_LOCATIONS = MONEY_LOCATIONS.map((x) => x.value);

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const dateFrom = sp.get('dateFrom') ?? undefined;
  const dateTo = sp.get('dateTo') ?? undefined;

  const [result, totals] = await Promise.all([
    getAccountingWithdrawals({ dateFrom, dateTo }),
    sumWithdrawalsInRange({ dateFrom, dateTo }),
  ]);

  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({
    withdrawals: result.withdrawals,
    periodTotal: totals.total,
    periodCount: totals.count,
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

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
  const amountRaw = b.amount;
  const amount =
    typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw ?? ''));
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const withdrawal_date = typeof b.withdrawal_date === 'string' ? b.withdrawal_date.trim() : '';
  if (!withdrawal_date || !/^\d{4}-\d{2}-\d{2}$/.test(withdrawal_date)) {
    return NextResponse.json({ error: 'withdrawal_date must be in YYYY-MM-DD format' }, { status: 400 });
  }

  const purpose = typeof b.purpose === 'string' ? b.purpose : '';
  const purposeErr = validateWithdrawalPurpose(purpose);
  if (purposeErr) return NextResponse.json({ error: purposeErr }, { status: 400 });

  const from_location = typeof b.from_location === 'string' ? b.from_location.trim() : 'bank';
  if (!VALID_MONEY_LOCATIONS.includes(from_location as never)) {
    return NextResponse.json(
      { error: `from_location must be one of: ${VALID_MONEY_LOCATIONS.join(', ')}` },
      { status: 400 }
    );
  }

  const currency = typeof b.currency === 'string' ? b.currency.trim() || 'THB' : 'THB';
  const notes = typeof b.notes === 'string' ? b.notes.trim() || null : null;
  const proof_file_path =
    typeof b.proof_file_path === 'string' ? b.proof_file_path.trim() || null : null;
  const created_by = session.user.email ?? 'unknown';

  const result = await createAccountingWithdrawal({
    amount,
    currency,
    withdrawal_date,
    from_location,
    purpose,
    notes,
    proof_file_path,
    proof_attached: !!proof_file_path,
    created_by,
  });

  if (result.error || !result.withdrawal) {
    return NextResponse.json({ error: result.error ?? 'Failed to create withdrawal' }, { status: 500 });
  }

  return NextResponse.json({ withdrawal: result.withdrawal }, { status: 201 });
}
