import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { convertToWebp, validateProductImage } from '@/lib/adminProductImages';
import {
  getCatalogBouquetByIdForAdmin,
  resolveCatalogBouquetId,
} from '@/lib/catalogAdmin';
import {
  isSupabaseCatalogConfigError,
  revalidateCatalogCacheAfterSupabaseWrite,
} from '@/lib/catalogRouting';
import { buildCatalogImageRecord, uploadBufferToCatalog } from '@/lib/catalog/storage';
import { appendCatalogBouquetImage } from '@/lib/catalogWrite';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function isConfigurationError(error: unknown): boolean {
  return error instanceof Error && isSupabaseCatalogConfigError(error.message);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bouquetId: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { bouquetId: rawBouquetId } = await params;
  const bouquetId = rawBouquetId?.trim();
  if (!bouquetId) {
    return NextResponse.json({ error: 'bouquetId required' }, { status: 400 });
  }

  const resolvedCatalogId = await resolveCatalogBouquetId(bouquetId);
  const bouquet = resolvedCatalogId
    ? await getCatalogBouquetByIdForAdmin(resolvedCatalogId)
    : null;

  if (!bouquet || !resolvedCatalogId) {
    return NextResponse.json({ error: 'Bouquet not found' }, { status: 404 });
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
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  const requestedAlt = typeof formData.get('alt') === 'string' ? String(formData.get('alt')).trim() : '';
  const alt = requestedAlt || bouquet.nameEn || 'Bouquet product image';

  try {
    await validateProductImage(file);
    const webp = await convertToWebp(file);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Catalog writes are not configured' }, { status: 503 });
    }
    const storagePath = `bouquets/${resolvedCatalogId}/gallery-${Date.now()}.webp`;
    const buffer = Buffer.from(await webp.arrayBuffer());
    await uploadBufferToCatalog(supabase, storagePath, buffer, 'image/webp');
    const record = buildCatalogImageRecord(supabase, storagePath, {
      format: 'webp',
      is_primary: false,
      alt,
      sort_order: 999,
    });

    await appendCatalogBouquetImage(resolvedCatalogId, {
      assetId: record.storage_path,
      alt,
      format: 'webp',
      isPrimary: false,
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/products/moderation');
    revalidatePath(`/admin/products/review/${bouquetId}`);
    revalidatePath(`/admin/products/bouquet/${bouquetId}`);
    if (bouquet.status === 'approved') {
      revalidatePath('/en/catalog', 'layout');
      revalidatePath('/th/catalog', 'layout');
      revalidatePath(`/en/catalog/${bouquet.slug}`);
      revalidatePath(`/th/catalog/${bouquet.slug}`);
      revalidateCatalogCacheAfterSupabaseWrite();
    }

    return NextResponse.json(
      {
        image: {
          assetId: record.storage_path,
          url: record.public_url,
          alt,
          format: 'webp',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isConfigurationError(error)) {
      return NextResponse.json({ error: 'Catalog writes are not configured' }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : 'Failed to upload image';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/review/images] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
