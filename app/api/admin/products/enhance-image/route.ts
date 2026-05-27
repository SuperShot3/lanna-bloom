import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { analyzeProductImage, enhanceProductImage, type ProductImageAnalysis } from '@/lib/adminProductAi';
import {
  convertToWebp,
  createPngMaster,
  fileToDataUrl,
  uploadProductImageVariants,
  validateProductImage,
} from '@/lib/adminProductImages';
import { isSupabaseCatalogConfigError } from '@/lib/catalogRouting';

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
    (error.message.includes('OPENAI_API_KEY') ||
      error.message.includes('SANITY_API_WRITE_TOKEN') ||
      isSupabaseCatalogConfigError(error.message))
  );
}

function isEmptyAnalysis(analysis: ProductImageAnalysis): boolean {
  return (
    !analysis.productFormat.trim() &&
    !analysis.wrappingOrContainer.trim() &&
    !analysis.arrangementStyle.trim() &&
    !analysis.confidenceNotes.trim() &&
    !analysis.rawSummary.trim() &&
    (analysis.identifiedFlowers ?? []).length === 0 &&
    (analysis.colors ?? []).length === 0 &&
    (analysis.greenery ?? []).length === 0 &&
    (analysis.suggestedOccasions ?? []).length === 0 &&
    (analysis.uncertainItems ?? []).length === 0
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

  const approvedAnalysis: ProductImageAnalysis =
    parseAnalysis(formData.get('approvedAnalysis')) ?? {
      productFormat: '',
      identifiedFlowers: [],
      colors: [],
      greenery: [],
      wrappingOrContainer: '',
      arrangementStyle: '',
      suggestedOccasions: [],
      confidenceNotes: '',
      uncertainItems: [],
      rawSummary: '',
    };

  const basePrompt =
    typeof formData.get('basePrompt') === 'string' ? String(formData.get('basePrompt')) : undefined;
  const presentationPreset =
    typeof formData.get('presentationPreset') === 'string'
      ? String(formData.get('presentationPreset'))
      : undefined;

  // Legacy single-prompt input (deprecated). Keep for backwards compatibility.
  const imageRules = typeof formData.get('imageRules') === 'string' ? String(formData.get('imageRules')) : undefined;
  const alt = typeof formData.get('alt') === 'string' ? String(formData.get('alt')).trim() : undefined;

  try {
    await validateProductImage(file);

    const effectiveAnalysis = isEmptyAnalysis(approvedAnalysis)
      ? await analyzeProductImage(file)
      : approvedAnalysis;

    const enhanced = await enhanceProductImage(file, effectiveAnalysis, {
      basePrompt,
      presentationPreset,
      imageRules,
    });
    const [webp, pngMaster] = await Promise.all([convertToWebp(enhanced), createPngMaster(enhanced)]);
    const variants = await uploadProductImageVariants({ webp, pngMaster, alt });

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
      return NextResponse.json(
        { error: 'OpenAI or catalog storage writes are not configured' },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to enhance image';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/enhance-image] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
