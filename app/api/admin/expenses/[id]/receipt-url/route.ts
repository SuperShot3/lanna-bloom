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
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const requestedPath = request.nextUrl.searchParams.get('path')?.trim() || null;
  let targetPath = requestedPath ?? expense.receipt_file_path ?? null;

  if (requestedPath) {
    const { data: linkedReceipt, error: linkedReceiptError } = await supabase
      .from('expense_receipt_images')
      .select('file_path')
      .eq('expense_id', expense.id)
      .eq('file_path', requestedPath)
      .limit(1)
      .maybeSingle();
    if (linkedReceiptError) {
      return NextResponse.json({ error: linkedReceiptError.message }, { status: 500 });
    }
    if (!linkedReceipt && requestedPath !== expense.receipt_file_path) {
      return NextResponse.json({ error: 'Receipt image not found for this expense' }, { status: 404 });
    }
    targetPath = requestedPath;
  }

  if (!targetPath) {
    return NextResponse.json({ error: 'No receipt attached to this expense' }, { status: 404 });
  }

  const downloadParam = request.nextUrl.searchParams.get('download');
  const shouldDownload = downloadParam === '1' || downloadParam === 'true' || downloadParam === 'yes';
  const fallbackFileName = targetPath.split('/').pop() ?? `receipt-${expense.id}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(targetPath, SIGNED_URL_TTL_SECONDS, {
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
