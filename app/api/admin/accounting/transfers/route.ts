import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { MONEY_LOCATIONS } from '@/types/accounting';
import { createAccountingTransfer, getAccountingTransfers } from '@/lib/accounting/transfers';

const VALID_MONEY_LOCATIONS = MONEY_LOCATIONS.map((x) => x.value);

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const dateFrom = sp.get('dateFrom') ?? undefined;
  const dateTo = sp.get('dateTo') ?? undefined;

  const result = await getAccountingTransfers({ dateFrom, dateTo });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ transfers: result.transfers });
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

  const transfer_date = typeof b.transfer_date === 'string' ? b.transfer_date.trim() : '';
  if (!transfer_date || !/^\d{4}-\d{2}-\d{2}$/.test(transfer_date)) {
    return NextResponse.json({ error: 'transfer_date must be in YYYY-MM-DD format' }, { status: 400 });
  }

  const from_location = typeof b.from_location === 'string' ? b.from_location.trim() : '';
  const to_location = typeof b.to_location === 'string' ? b.to_location.trim() : '';
  if (!VALID_MONEY_LOCATIONS.includes(from_location as never)) {
    return NextResponse.json(
      { error: `from_location must be one of: ${VALID_MONEY_LOCATIONS.join(', ')}` },
      { status: 400 }
    );
  }
  if (!VALID_MONEY_LOCATIONS.includes(to_location as never)) {
    return NextResponse.json(
      { error: `to_location must be one of: ${VALID_MONEY_LOCATIONS.join(', ')}` },
      { status: 400 }
    );
  }
  if (from_location === to_location) {
    return NextResponse.json({ error: 'from_location and to_location must be different' }, { status: 400 });
  }

  const currency = typeof b.currency === 'string' ? b.currency.trim() || 'THB' : 'THB';
  const note = typeof b.note === 'string' ? b.note.trim() || null : null;
  const created_by = session.user.email ?? 'unknown';

  const result = await createAccountingTransfer({
    amount,
    currency,
    transfer_date,
    from_location,
    to_location,
    note,
    created_by,
  });

  if (result.error || !result.transfer) {
    return NextResponse.json({ error: result.error ?? 'Failed to create transfer' }, { status: 500 });
  }

  return NextResponse.json({ transfer: result.transfer }, { status: 201 });
}

