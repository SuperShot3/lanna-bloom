import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { listExpenseCategories, createExpenseCategory } from '@/lib/expenses/expenseCategoryQueries';
import { EXPENSE_CATEGORY_COLORS } from '@/types/expenses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const activeOnly = request.nextUrl.searchParams.get('activeOnly') === '1';
  const result = await listExpenseCategories({ activeOnly });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ categories: result.categories });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

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

  const label = typeof b.label === 'string' ? b.label.trim() : '';
  if (!label || label.length > 80) {
    return NextResponse.json({ error: 'label must be 1-80 characters' }, { status: 400 });
  }

  const color = typeof b.color === 'string' ? b.color : '';
  if (!EXPENSE_CATEGORY_COLORS.includes(color)) {
    return NextResponse.json({ error: 'color must be one of the curated swatches' }, { status: 400 });
  }

  if (typeof b.is_cogs !== 'boolean') {
    return NextResponse.json({ error: 'is_cogs must be a boolean' }, { status: 400 });
  }

  const result = await createExpenseCategory({ label, color, is_cogs: b.is_cogs });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ category: result.category }, { status: 201 });
}
