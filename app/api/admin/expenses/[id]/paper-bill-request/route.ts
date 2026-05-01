import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenseById, updateExpense } from '@/lib/expenses/expenseQueries';
import { getOrderByOrderId } from '@/lib/supabase/adminQueries';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { buildPaperBillRequestPdf } from '@/lib/expenses/paperBillRequestPdf';

const BUCKET = 'receipts';

function parseDisplayName(path: string): string {
  const raw = path.split('/').pop() ?? path;
  return decodeURIComponent(raw);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const expenseId = id?.trim();
  if (!expenseId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const expense = await getExpenseById(expenseId);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const orderId = expense.linked_order_id?.trim();
  if (!orderId) {
    return NextResponse.json(
      { error: 'This expense is not linked to an order. Link an order to generate a paper bill request.' },
      { status: 400 }
    );
  }

  const { order, items, error: orderErr } = await getOrderByOrderId(orderId);
  if (orderErr || !order) {
    return NextResponse.json(
      { error: orderErr ?? 'Linked order not found' },
      { status: 404 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const { data: receiptRows, error: recErr } = await supabase
    .from('expense_receipt_images')
    .select('file_path, file_name, created_at')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (recErr) {
    return NextResponse.json({ error: recErr.message }, { status: 500 });
  }

  const pathSet: { path: string; label: string }[] = [];
  for (const row of receiptRows ?? []) {
    const p = typeof row.file_path === 'string' ? row.file_path.trim() : '';
    if (!p) continue;
    const name =
      typeof row.file_name === 'string' && row.file_name.trim()
        ? row.file_name.trim()
        : parseDisplayName(p);
    pathSet.push({ path: p, label: name });
  }
  if (expense.receipt_file_path?.trim()) {
    const p = expense.receipt_file_path.trim();
    if (!pathSet.some((x) => x.path === p)) {
      pathSet.push({ path: p, label: parseDisplayName(p) });
    }
  }

  const receiptFiles: { bytes: Uint8Array; label: string }[] = [];
  for (const { path, label } of pathSet) {
    const { data, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
    if (dlErr || !data) {
      console.warn('[paper-bill-request] skip receipt download:', path, dlErr?.message);
      continue;
    }
    const buf = new Uint8Array(await data.arrayBuffer());
    if (buf.byteLength === 0) continue;
    receiptFiles.push({ bytes: buf, label });
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildPaperBillRequestPdf({
      expense,
      order,
      items,
      receiptFiles,
    });
  } catch (e) {
    console.error('[paper-bill-request] PDF build failed:', e);
    return NextResponse.json({ error: 'Failed to build PDF' }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await updateExpense(expenseId, { paper_bill_requested_at: nowIso });
  if (updErr) {
    console.error('[paper-bill-request] failed to record timestamp:', updErr);
    return NextResponse.json({ error: updErr }, { status: 500 });
  }

  const safeOrder = orderId.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
  const filename = `paper-bill-request-${safeOrder}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
