import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  MAX_RECEIPT_UPLOAD_BYTES,
  formatMaxFileErrorLabel,
} from '@/lib/receiptUploadLimits';
import {
  ORDER_ITEM_PHOTO_BUCKET,
  ORDER_ITEM_PHOTO_SIGNED_TTL_SECONDS,
  buildOrderItemPhotoStoragePath,
  createOrderItemPhotoSignedUrl,
  getOrderItemForPhoto,
  isOrderItemPhotoStoragePath,
} from '@/lib/admin/itemPurchasePhoto';

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
  return map[mimeType] ?? 'jpg';
}

function resolveUploadType(file: Blob): string | null {
  const t = (file.type || '').toLowerCase().trim();
  if (ALLOWED_TYPES.includes(t)) return t;
  // iPhone Photo picker often leaves type empty; client compresses to JPEG.
  if (!t) return 'image/jpeg';
  return null;
}

async function removeStoragePath(path: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.storage.from(ORDER_ITEM_PHOTO_BUCKET).remove([path]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string; item_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { order_id, item_id } = await params;
  const orderId = order_id?.trim();
  const itemId = item_id?.trim();
  if (!orderId || !itemId) {
    return NextResponse.json({ error: 'order_id and item_id required' }, { status: 400 });
  }

  const found = await getOrderItemForPhoto(orderId, itemId);
  if (!found.ok) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }
  const path = found.item.purchase_photo_path?.trim();
  if (!path) {
    return NextResponse.json({ error: 'No purchase photo attached' }, { status: 404 });
  }
  if (!isOrderItemPhotoStoragePath(orderId, itemId, path)) {
    return NextResponse.json({ error: 'Invalid photo path' }, { status: 400 });
  }

  const downloadParam = request.nextUrl.searchParams.get('download');
  const shouldDownload = downloadParam === '1' || downloadParam === 'true';
  const signed = await createOrderItemPhotoSignedUrl(path, shouldDownload);
  if (!signed.ok) {
    return NextResponse.json({ error: signed.error }, { status: signed.status });
  }

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    path,
    expiresIn: ORDER_ITEM_PHOTO_SIGNED_TTL_SECONDS,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string; item_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { order_id, item_id } = await params;
  const orderId = order_id?.trim();
  const itemId = item_id?.trim();
  if (!orderId || !itemId) {
    return NextResponse.json({ error: 'order_id and item_id required' }, { status: 400 });
  }

  const found = await getOrderItemForPhoto(orderId, itemId);
  if (!found.ok) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
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
  const mime = resolveUploadType(file);
  if (!mime) {
    return NextResponse.json(
      { error: `File type not allowed. Accepted: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_RECEIPT_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${formatMaxFileErrorLabel(MAX_RECEIPT_UPLOAD_BYTES)})` },
      { status: 413 }
    );
  }

  const ext = fileExtension(mime);
  const storagePath = buildOrderItemPhotoStoragePath(orderId, itemId, ext);
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(ORDER_ITEM_PHOTO_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: false,
    });
  if (uploadError) {
    console.error('[item-purchase-photo] upload error:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const previous = found.item.purchase_photo_path?.trim() || null;
  const { error: updateError } = await supabase
    .from('order_items')
    .update({ purchase_photo_path: storagePath })
    .eq('order_id', orderId)
    .eq('id', itemId);
  if (updateError) {
    await removeStoragePath(storagePath);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (previous && previous !== storagePath && isOrderItemPhotoStoragePath(orderId, itemId, previous)) {
    await removeStoragePath(previous);
  }

  const signed = await createOrderItemPhotoSignedUrl(storagePath);
  if (!signed.ok) {
    return NextResponse.json({
      path: storagePath,
      signedUrl: null,
      warning: signed.error,
    });
  }

  return NextResponse.json({ path: storagePath, signedUrl: signed.signedUrl });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ order_id: string; item_id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { order_id, item_id } = await params;
  const orderId = order_id?.trim();
  const itemId = item_id?.trim();
  if (!orderId || !itemId) {
    return NextResponse.json({ error: 'order_id and item_id required' }, { status: 400 });
  }

  const found = await getOrderItemForPhoto(orderId, itemId);
  if (!found.ok) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
  }

  const previous = found.item.purchase_photo_path?.trim() || null;
  const { error: updateError } = await supabase
    .from('order_items')
    .update({ purchase_photo_path: null })
    .eq('order_id', orderId)
    .eq('id', itemId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (previous && isOrderItemPhotoStoragePath(orderId, itemId, previous)) {
    await removeStoragePath(previous);
  }

  return NextResponse.json({ ok: true });
}
