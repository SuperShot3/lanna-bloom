import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { convertToWebp, validateProductImage } from '@/lib/adminProductImages';
import { buildCatalogImageRecord, uploadBufferToCatalog } from '@/lib/catalog/storage';
import { appendCatalogSoldHistoryImage } from '@/lib/catalogWrite';
import { createCatalogAuditEvent } from '@/lib/catalogCms';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type EntityType = 'bouquet' | 'product';

function parseEntityType(value: string): EntityType | null {
  return value === 'bouquet' || value === 'product' ? value : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const { entityType: rawEntityType, entityId: rawEntityId } = await params;
  const entityType = parseEntityType(rawEntityType);
  const entityId = rawEntityId?.trim();
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'Invalid entityType or entityId' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Catalog writes are not configured' }, { status: 503 });
  }

  const table = entityType === 'product' ? 'catalog_products' : 'catalog_bouquets';
  const { data: entity } = await supabase.from(table).select('id').eq('id', entityId).maybeSingle();
  if (!entity) {
    return NextResponse.json({ error: `${entityType} not found` }, { status: 404 });
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

  try {
    await validateProductImage(file);
    const webp = await convertToWebp(file);

    const folder = entityType === 'product' ? 'products' : 'bouquets';
    const storagePath = `${folder}/${entityId}/sold-history-${Date.now()}.webp`;
    const buffer = Buffer.from(await webp.arrayBuffer());
    await uploadBufferToCatalog(supabase, storagePath, buffer, 'image/webp');
    const record = buildCatalogImageRecord(supabase, storagePath, {
      format: 'webp',
      is_primary: false,
      sort_order: 999,
    });

    await appendCatalogSoldHistoryImage(entityType, entityId, {
      assetId: record.storage_path,
      format: 'webp',
      isPrimary: false,
    });

    await createCatalogAuditEvent({
      entityType,
      entityId,
      action: 'sold_history_image_add',
      actor: session.user.email ?? 'unknown',
      afterSummary: { storage_path: record.storage_path },
    });

    revalidatePath('/admin/products/sold-history');

    return NextResponse.json(
      { image: { storagePath: record.storage_path, url: record.public_url, format: 'webp' } },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/sold-history/images] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
