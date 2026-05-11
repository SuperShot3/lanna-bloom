import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getExpenseById, updateExpense } from '@/lib/expenses/expenseQueries';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  MAX_RECEIPT_IMAGES_PER_EXPENSE,
  MAX_RECEIPT_UPLOAD_BYTES,
  formatMaxFileErrorLabel,
} from '@/lib/receiptUploadLimits';
import { setBillLineProofReceived } from '@/types/expenses';

const BUCKET = 'receipts';
const MAX_BYTES = MAX_RECEIPT_UPLOAD_BYTES;
const ALLOWED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

function fileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return map[mimeType] ?? 'bin';
}

function sanitizeBaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'receipt';
}

function parseDisplayName(path: string): string {
  const raw = path.split('/').pop() ?? path;
  return decodeURIComponent(raw);
}

function countShownReceiptImages(
  rows: Array<{ file_path: unknown }> | null,
  legacyPath: string | null
): number {
  const paths = new Set<string>();
  for (const row of rows ?? []) {
    if (typeof row.file_path === 'string' && row.file_path) paths.add(row.file_path);
  }
  if (legacyPath) paths.add(legacyPath);
  return paths.size;
}

export async function GET(
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('expense_receipt_images')
    .select('id, file_path, file_name, created_at')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const receipts = (data ?? []).map((row) => ({
    id: String(row.id),
    file_path: String(row.file_path),
    file_name: (row.file_name as string | null) ?? parseDisplayName(String(row.file_path)),
    created_at: String(row.created_at),
    is_legacy: false,
  }));

  if (expense.receipt_file_path) {
    const hasLegacy = receipts.some((r) => r.file_path === expense.receipt_file_path);
    if (!hasLegacy) {
      receipts.unshift({
        id: `legacy-${expense.id}`,
        file_path: expense.receipt_file_path,
        file_name: parseDisplayName(expense.receipt_file_path),
        created_at: expense.updated_at,
        is_legacy: true,
      });
    }
  }

  return NextResponse.json({
    receipts,
    count: receipts.length,
  });
}

export async function POST(
  request: NextRequest,
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from('expense_receipt_images')
    .select('file_path')
    .eq('expense_id', expenseId);

  if (existingRowsError) {
    return NextResponse.json({ error: existingRowsError.message }, { status: 500 });
  }

  const existingReceiptCount = countShownReceiptImages(existingRows ?? [], expense.receipt_file_path);
  if (existingReceiptCount >= MAX_RECEIPT_IMAGES_PER_EXPENSE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_RECEIPT_IMAGES_PER_EXPENSE} receipt images per expense row.` },
      { status: 400 }
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${formatMaxFileErrorLabel(MAX_RECEIPT_UPLOAD_BYTES)})` },
      { status: 413 }
    );
  }

  const ext = fileExtension(file.type);
  const sourceName = file instanceof File ? file.name : 'receipt';
  const baseName = sanitizeBaseName(sourceName);
  const timestamp = Date.now();
  const storagePath = `${timestamp}-${baseName}-${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const fileName = `${baseName}.${ext}`;
  const { data: receiptRow, error: insertError } = await supabase
    .from('expense_receipt_images')
    .insert({
      expense_id: expenseId,
      file_path: storagePath,
      file_name: fileName,
    })
    .select('id, file_path, file_name, created_at')
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const nextMainPath = expense.receipt_file_path ?? storagePath;
  const updateInput: Parameters<typeof updateExpense>[1] = {
    receipt_attached: true,
    receipt_file_path: nextMainPath,
  };
  if (expense.bill_tracking && expense.bill_tracking.length > 0) {
    updateInput.bill_tracking = expense.bill_tracking.map((line) =>
      setBillLineProofReceived(line, true)
    );
  }
  const updated = await updateExpense(expenseId, updateInput);
  if (updated.error) {
    return NextResponse.json({ error: updated.error }, { status: 500 });
  }

  return NextResponse.json({
    receipt: {
      id: String(receiptRow.id),
      file_path: String(receiptRow.file_path),
      file_name: String(receiptRow.file_name ?? fileName),
      created_at: String(receiptRow.created_at),
      is_legacy: false,
    },
    expense: updated.expense,
  }, { status: 201 });
}
