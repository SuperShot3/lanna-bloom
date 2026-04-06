import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenses, createExpense } from '@/lib/expenses/expenseQueries';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types/expenses';

const VALID_CATEGORIES = EXPENSE_CATEGORIES.map((c) => c.value);
const VALID_PAYMENT_METHODS = PAYMENT_METHODS.map((m) => m.value);

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const filters = {
    dateFrom:       sp.get('dateFrom')       ?? undefined,
    dateTo:         sp.get('dateTo')         ?? undefined,
    category:       sp.get('category')       ?? undefined,
    payment_method: sp.get('payment_method') ?? undefined,
  };
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '30', 10)));

  const result = await getExpenses(filters, { page, pageSize });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    expenses:    result.expenses,
    total:       result.total,
    totalAmount: result.totalAmount,
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

  // --- Validate required fields ---
  const amountRaw = b.amount;
  const amount =
    typeof amountRaw === 'number'
      ? amountRaw
      : parseFloat(String(amountRaw ?? ''));
  if (Number.isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
  }

  const date = typeof b.date === 'string' ? b.date.trim() : '';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
  }

  const category = typeof b.category === 'string' ? b.category.trim() : '';
  if (!VALID_CATEGORIES.includes(category as never)) {
    return NextResponse.json(
      { error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }
  if (description.length > 500) {
    return NextResponse.json({ error: 'description must be at most 500 characters' }, { status: 400 });
  }

  const payment_method = typeof b.payment_method === 'string' ? b.payment_method.trim() : '';
  if (!VALID_PAYMENT_METHODS.includes(payment_method as never)) {
    return NextResponse.json(
      { error: `payment_method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}` },
      { status: 400 }
    );
  }

  const currency          = typeof b.currency === 'string' ? b.currency.trim() || 'THB' : 'THB';
  const receipt_file_path = typeof b.receipt_file_path === 'string' ? b.receipt_file_path.trim() || null : null;
  const receipt_attached  = receipt_file_path ? true : (b.receipt_attached === true);
  const notes             = typeof b.notes === 'string' ? b.notes.trim() || null : null;
  const linked_order_id   = typeof b.linked_order_id === 'string' ? b.linked_order_id.trim() || null : null;

  const created_by = session.user.email ?? 'unknown';

  const { expense, error } = await createExpense({
    amount,
    currency,
    date,
    category,
    description,
    payment_method,
    receipt_file_path,
    receipt_attached,
    created_by,
    notes,
    linked_order_id,
  });

  if (error || !expense) {
    return NextResponse.json({ error: error ?? 'Failed to create expense' }, { status: 500 });
  }

  return NextResponse.json({ expense }, { status: 201 });
}
