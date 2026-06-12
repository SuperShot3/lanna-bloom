import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  analyzeProductImage,
  generateProductDescription,
  type ProductDraftHints,
} from '@/lib/adminProductAi';
import { validateProductImage } from '@/lib/adminProductImages';

export const runtime = 'nodejs';

function parseHints(value: FormDataEntryValue | null): ProductDraftHints {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as ProductDraftHints) : {};
  } catch {
    return {};
  }
}

function isConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('OPENAI_API_KEY');
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

  const hints = parseHints(formData.get('hints'));

  try {
    await validateProductImage(file);
    const analysis = await analyzeProductImage(file, hints);
    const draft = await generateProductDescription(analysis, hints);

    return NextResponse.json({
      status: 'copy_generated',
      analysis,
      draft,
    });
  } catch (error) {
    if (isConfigurationError(error)) {
      return NextResponse.json({ error: 'OpenAI is not configured' }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : 'Failed to create AI draft';
    const status = message.includes('too large') ? 413 : 400;
    console.error('[admin-products/ai-draft] error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
