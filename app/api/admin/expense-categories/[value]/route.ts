import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenseCategoryByValue, updateExpenseCategory } from '@/lib/expenses/expenseCategoryQueries';
import { EXPENSE_CATEGORY_COLORS } from '@/types/expenses';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ value: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { value } = await params;
  const result = await getExpenseCategoryByValue(value);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ category: result.category });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ value: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { value } = await params;

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

  const patch: { label?: string; color?: string; is_cogs?: boolean; active?: boolean } = {};

  if ('label' in b) {
    if (typeof b.label !== 'string' || !b.label.trim() || b.label.trim().length > 80) {
      return NextResponse.json({ error: 'label must be 1-80 characters' }, { status: 400 });
    }
    patch.label = b.label.trim();
  }
  if ('color' in b) {
    if (typeof b.color !== 'string' || !EXPENSE_CATEGORY_COLORS.includes(b.color)) {
      return NextResponse.json({ error: 'color must be one of the curated swatches' }, { status: 400 });
    }
    patch.color = b.color;
  }
  if ('is_cogs' in b) {
    if (typeof b.is_cogs !== 'boolean') {
      return NextResponse.json({ error: 'is_cogs must be a boolean' }, { status: 400 });
    }
    patch.is_cogs = b.is_cogs;
  }
  if ('active' in b) {
    if (typeof b.active !== 'boolean') {
      return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 });
    }
    patch.active = b.active;
  }

  const result = await updateExpenseCategory(value, patch);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ category: result.category });
}
