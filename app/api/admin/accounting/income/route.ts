import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  getIncomeRecords,
  createIncomeRecord,
  incomeExistsForOrder,
} from '@/lib/accounting/incomeRecords';
import {
  INCOME_SOURCE_TYPES,
  INCOME_PAYMENT_METHODS,
  MONEY_LOCATIONS,
} from '@/types/accounting';

const VALID_SOURCE_TYPES   = INCOME_SOURCE_TYPES.map((t) => t.value);
const VALID_PAYMENT_METHODS = INCOME_PAYMENT_METHODS.map((m) => m.value);
const VALID_MONEY_LOCATIONS = MONEY_LOCATIONS.map((l) => l.value);

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const filters = {
    dateFrom:      sp.get('dateFrom')      ?? undefined,
    dateTo:        sp.get('dateTo')        ?? undefined,
    source_mode:   sp.get('source_mode')   ?? undefined,
    source_type:   sp.get('source_type')   ?? undefined,
    income_status: sp.get('income_status') ?? undefined,
  };
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '30', 10)));

  const result = await getIncomeRecords(filters, { page, pageSize });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    records:                    result.records,
    total:                      result.total,
    totalConfirmedAmount:       result.totalConfirmedAmount,
    totalConfirmedStripeFees:   result.totalConfirmedStripeFees,
    totalConfirmedNetAmount:    result.totalConfirmedNetAmount,
    totalPendingAmount:         result.totalPendingAmount,
    page,
    pageSize,
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

  // --- Validate ---
  const amountRaw = b.amount;
  const amount =
    typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw ?? ''));
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const source_type = typeof b.source_type === 'string' ? b.source_type.trim() : '';
  if (!VALID_SOURCE_TYPES.includes(source_type as never)) {
    return NextResponse.json(
      { error: `source_type must be one of: ${VALID_SOURCE_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const payment_method = typeof b.payment_method === 'string' ? b.payment_method.trim() : '';
  if (!VALID_PAYMENT_METHODS.includes(payment_method as never)) {
    return NextResponse.json(
      { error: `payment_method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` },
      { status: 400 }
    );
  }

  const money_location = typeof b.money_location === 'string' ? b.money_location.trim() : '';
  if (!VALID_MONEY_LOCATIONS.includes(money_location as never)) {
    return NextResponse.json(
      { error: `money_location must be one of: ${VALID_MONEY_LOCATIONS.join(', ')}` },
      { status: 400 }
    );
  }

  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  const order_id          = typeof b.order_id === 'string' ? b.order_id.trim() || null : null;
  const external_reference = typeof b.external_reference === 'string' ? b.external_reference.trim() || null : null;
  const proof_file_path   = typeof b.proof_file_path === 'string' ? b.proof_file_path.trim() || null : null;
  const notes             = typeof b.notes === 'string' ? b.notes.trim() || null : null;
  const currency          = typeof b.currency === 'string' ? b.currency.trim() || 'THB' : 'THB';

  // Duplicate check: if order_id provided, ensure no existing record
  if (order_id) {
    const exists = await incomeExistsForOrder(order_id);
    if (exists) {
      return NextResponse.json(
        {
          error:     'An income record already exists for this order ID.',
          duplicate: true,
        },
        { status: 409 }
      );
    }
  }

  const created_by = session.user.email ?? 'unknown';

  const { record, error, duplicate } = await createIncomeRecord({
    order_id,
    source_mode:     'manual',
    source_type:     source_type as never,
    amount,
    currency,
    payment_method:  payment_method as never,
    money_location:  money_location as never,
    income_status:   'pending',
    description,
    external_reference,
    proof_file_path,
    receipt_attached: !!proof_file_path,
    notes,
    created_by,
  });

  if (duplicate) {
    return NextResponse.json({ error: 'Duplicate: income record already exists for this order', duplicate: true }, { status: 409 });
  }
  if (error || !record) {
    return NextResponse.json({ error: error ?? 'Failed to create income record' }, { status: 500 });
  }

  return NextResponse.json({ record }, { status: 201 });
}
