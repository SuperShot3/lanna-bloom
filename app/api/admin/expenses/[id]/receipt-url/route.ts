import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenseById } from '@/lib/expenses/expenseQueries';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const expense = await getExpenseById(id.trim());
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }
  if (!expense.receipt_file_path) {
    return NextResponse.json({ error: 'No receipt attached to this expense' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const downloadParam = request.nextUrl.searchParams.get('download');
  const shouldDownload = downloadParam === '1' || downloadParam === 'true' || downloadParam === 'yes';
  const fallbackFileName = expense.receipt_file_path.split('/').pop() ?? `receipt-${expense.id}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(expense.receipt_file_path, SIGNED_URL_TTL_SECONDS, {
      download: shouldDownload ? fallbackFileName : undefined,
    });

  if (error || !data?.signedUrl) {
    console.error('[receipt-url] signed URL error:', error?.message);
    return NextResponse.json({ error: 'Failed to generate receipt URL' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
