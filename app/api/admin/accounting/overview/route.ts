import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getAccountingOverview } from '@/lib/accounting/incomeRecords';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const sp = request.nextUrl.searchParams;
  const dateFrom = sp.get('dateFrom') ?? undefined;
  const dateTo   = sp.get('dateTo')   ?? undefined;

  const overview = await getAccountingOverview({ dateFrom, dateTo });
  if (!overview) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const periodLabel =
    dateFrom && dateTo ? `${dateFrom} → ${dateTo}`
    : dateFrom ? `From ${dateFrom}`
    : dateTo   ? `Until ${dateTo}`
    : 'All time';

  return NextResponse.json({ ...overview, periodLabel });
}
