import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { enhanceProductImage, type ProductImageAnalysis } from '@/lib/adminProductAi';
import {
  convertToWebp,
  createPngMaster,
  fileToDataUrl,
  uploadProductImagesToSanity,
  validateProductImage,
} from '@/lib/adminProductImages';

export const runtime = 'nodejs';

function parseAnalysis(value: FormDataEntryValue | null): ProductImageAnalysis | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as ProductImageAnalysis) : null;
  } catch {
    return null;
  }
}

function isConfigurationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('OPENAI_API_KEY') || error.message.includes('SANITY_API_WRITE_TOKEN'))
  );
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
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  const approvedAnalysis = parseAnalysis(formData.get('approvedAnalysis'));
  if (!approvedAnalysis) {
    return NextResponse.json({ error: 'approvedAnalysis is required' }, { status: 400 });
  }

  const imageRules = typeof formData.get('imageRules') === 'string' ? String(formData.get('imageRules')) : undefined;
  const alt = typeof formData.get('alt') === 'string' ? String(formData.get('alt')).trim() : undefined;

  try {
    await validateProductImage(file);
    const enhanced = await enhanceProductImage(file, approvedAnalysis, imageRules);
    const [webp, pngMaster] = await Promise.all([convertToWebp(enhanced), createPngMaster(enhanced)]);
    const variants = await uploadProductImagesToSanity({ webp, pngMaster, alt });

    return NextResponse.json({
      status: 'image_enhanced',
      variants,
      previews: {
        webp: await fileToDataUrl(webp),
        pngMaster: await fileToDataUrl(pngMaster),
      },
    });
  } catch (error) {
    if (isConfigurationError(error)) {
      return NextResponse.json({ error: 'OpenAI or Sanity writes are not configured' }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : 'Failed to enhance image';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/enhance-image] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
