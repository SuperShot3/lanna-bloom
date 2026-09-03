import { NextRequest, NextResponse } from 'next/server';
import { bodyHasHoneypot, getClientIp, NO_STORE } from '@/lib/info/guideComments/apiHelpers';
import {
  bouquetIsApprovedForReviews,
  insertPendingProductReview,
  validateProductReviewInput,
} from '@/lib/productReviews';
import { checkProductReviewSubmitRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkProductReviewSubmitRateLimit(ip)) {
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

  const validation = validateProductReviewInput({
    bouquetId: typeof b.bouquetId === 'string' ? b.bouquetId : undefined,
    displayName: typeof b.displayName === 'string' ? b.displayName : undefined,
    rating: b.rating,
    reviewText: typeof b.reviewText === 'string' ? b.reviewText : undefined,
    locale: typeof b.locale === 'string' ? b.locale : undefined,
  });

  if (!validation.ok) {
    const status = validation.message === 'Product not found' ? 404 : 400;
    return NextResponse.json({ error: validation.message }, { status, headers: NO_STORE });
  }

  try {
    const live = await bouquetIsApprovedForReviews(validation.data.bouquetId);
    if (!live) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: NO_STORE });
    }

    const result = await insertPendingProductReview(validation.data);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Something went wrong. Please try again later.' },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE });
  } catch (err) {
    console.error('[api/product-reviews] POST failed', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500, headers: NO_STORE }
    );
  }
}
