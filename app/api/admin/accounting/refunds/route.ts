import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getIncomeRefunds } from '@/lib/accounting/incomeRefunds';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '30', 10) || 30));
  const result = await getIncomeRefunds(
    {
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
    },
    { page, pageSize }
  );

  return NextResponse.json(result);
}
