import { NextRequest, NextResponse } from 'next/server';
import { generateWeddingBouquetCopy } from '@/lib/weddingBouquetDesigner/llmClient';
import { validateWeddingBouquetAnswers } from '@/lib/weddingBouquetDesigner/validate';
import { checkWeddingBouquetDesignerGenerateRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkWeddingBouquetDesignerGenerateRateLimit(ip);
  if (!rateLimit.allowed) {
    const retryAfterMinutes = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 60_000));
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterMinutes },
      { status: 429, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE });
  }

  const validation = validateWeddingBouquetAnswers(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400, headers: NO_STORE });
  }

  const result = await generateWeddingBouquetCopy(validation.data);
  if (!result) {
    return NextResponse.json(
      { error: 'GENERATION_UNAVAILABLE' },
      { status: 200, headers: NO_STORE }
    );
  }

  return NextResponse.json(result, { status: 200, headers: NO_STORE });
}
