import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const BUCKET = 'receipts';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

function fileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg':       'jpg',
    'image/png':        'png',
    'image/webp':       'webp',
    'image/heic':       'heic',
    'application/pdf':  'pdf',
  };
  return map[mimeType] ?? 'bin';
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

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
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const timestamp = Date.now();
  const ext = fileExtension(file.type);
  const storagePath = `${timestamp}-${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('[upload-receipt] storage upload error:', error.message);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  return NextResponse.json({ path: storagePath }, { status: 201 });
}
