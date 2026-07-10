import { NextRequest, NextResponse } from 'next/server';
import { hashVisitorToken } from '@/lib/info/guideComments/hash';
import { getApprovedCommentById } from '@/lib/info/guideComments/read';
import { insertGuideCommentReaction } from '@/lib/info/guideComments/write';
import { normalizeVisitorToken, validateCommentId } from '@/lib/info/guideComments/validate';
import { getClientIp, NO_STORE } from '@/lib/info/guideComments/apiHelpers';
import { checkGuideCommentLikeRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  if (!checkGuideCommentLikeRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: NO_STORE }
    );
  }

  const { id: rawId } = await params;
  const commentId = validateCommentId(rawId);
  if (!commentId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
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
  const visitorToken = normalizeVisitorToken(
    typeof b.visitorToken === 'string' ? b.visitorToken : undefined
  );
  if (!visitorToken) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  }

  try {
    const comment = await getApprovedCommentById(commentId);
    if (!comment || comment.status !== 'approved') {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });
    }

    const visitorTokenHash = hashVisitorToken(visitorToken);
    const result = await insertGuideCommentReaction(commentId, visitorTokenHash);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again later.' },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { helpfulCount: result.helpfulCount },
      { status: 200, headers: NO_STORE }
    );
  } catch (err) {
    console.error('[api/info/comments/[id]/like] POST failed', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500, headers: NO_STORE }
    );
  }
}
