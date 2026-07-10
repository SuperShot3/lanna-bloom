import { NextRequest, NextResponse } from 'next/server';
import { hashVisitorToken } from '@/lib/info/guideComments/hash';
import { getApprovedGuideComments } from '@/lib/info/guideComments/read';
import {
  hasRecentDuplicateComment,
  insertPendingGuideComment,
} from '@/lib/info/guideComments/write';
import { validateCommentInput } from '@/lib/info/guideComments/validate';
import { isCommentableGuideSlug } from '@/lib/info/guideComments/allowlist';
import {
  bodyHasHoneypot,
  getClientIp,
  NO_STORE,
  PUBLIC_CACHE,
} from '@/lib/info/guideComments/apiHelpers';
import {
  checkGuideCommentReadRateLimit,
  checkGuideCommentSubmitRateLimit,
  checkGuideCommentVisitorCooldown,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkGuideCommentReadRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  const guideSlug = req.nextUrl.searchParams.get('guideSlug')?.trim().toLowerCase() ?? '';
  if (!isCommentableGuideSlug(guideSlug)) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404, headers: NO_STORE });
  }

  try {
    const comments = await getApprovedGuideComments(guideSlug);
    return NextResponse.json({ comments }, { status: 200, headers: PUBLIC_CACHE });
  } catch (err) {
    console.error('[api/info/comments] GET failed', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkGuideCommentSubmitRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: NO_STORE });
  }

  const b = body as Record<string, unknown>;

  if (bodyHasHoneypot(b)) {
    return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE });
  }

  const validation = validateCommentInput({
    guideSlug: typeof b.guideSlug === 'string' ? b.guideSlug : undefined,
    authorName: typeof b.authorName === 'string' ? b.authorName : undefined,
    authorEmail: typeof b.authorEmail === 'string' ? b.authorEmail : undefined,
    body: typeof b.body === 'string' ? b.body : undefined,
    locale: typeof b.locale === 'string' ? b.locale : undefined,
    visitorToken: typeof b.visitorToken === 'string' ? b.visitorToken : undefined,
    visitorTokenHash: hashVisitorToken,
  });

  if (!validation.ok) {
    const status = validation.message === 'Guide not found' ? 404 : 400;
    return NextResponse.json({ error: validation.message }, { status, headers: NO_STORE });
  }

  if (!checkGuideCommentVisitorCooldown(validation.data.visitorTokenHash)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  try {
    const isDuplicate = await hasRecentDuplicateComment(validation.data);
    if (isDuplicate) {
      return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE });
    }

    const result = await insertPendingGuideComment(validation.data);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again later.' },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE });
  } catch (err) {
    console.error('[api/info/comments] POST failed', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500, headers: NO_STORE }
    );
  }
}
