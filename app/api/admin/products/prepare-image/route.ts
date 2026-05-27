import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  convertToWebp,
  createPngMaster,
  fileToDataUrl,
  uploadProductImageVariants,
  validateProductImage,
} from '@/lib/adminProductImages';
import { isSupabaseCatalogConfigError } from '@/lib/catalogRouting';

export const runtime = 'nodejs';

function isConfigurationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('SUPABASE_URL') ||
      error.message.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      isSupabaseCatalogConfigError(error.message))
  );
}

/**
 * Manual image processing (no AI).
 *
 * Accepts an image that the admin has already cropped client-side, produces the
 * WebP + PNG master variants, uploads them to the `catalog` Supabase Storage bucket,
 * and returns the same `{ variants, previews }` shape as `/enhance-image` so the
 * client wizard can use a single rendering path.
 */
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
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  const altRaw = formData.get('alt');
  const alt = typeof altRaw === 'string' ? altRaw.trim() : undefined;

  try {
    await validateProductImage(file);
    const [webp, pngMaster] = await Promise.all([convertToWebp(file), createPngMaster(file)]);
    const variants = await uploadProductImageVariants({ webp, pngMaster, alt });

    return NextResponse.json({
      status: 'image_prepared',
      variants,
      previews: {
        webp: await fileToDataUrl(webp),
        pngMaster: await fileToDataUrl(pngMaster),
      },
    });
  } catch (error) {
    if (isConfigurationError(error)) {
      return NextResponse.json(
        { error: 'Catalog storage writes are not configured' },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to prepare image';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/prepare-image] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
