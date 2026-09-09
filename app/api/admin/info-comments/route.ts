import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import {
  getAllGuideCommentsForAdmin,
  getPendingGuideCommentCount,
} from '@/lib/info/guideComments/read';
import { getPendingProductReviewCount } from '@/lib/productReviews';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  try {
    if (request.nextUrl.searchParams.get('pendingCount') === '1') {
      const [commentCount, reviewCount] = await Promise.all([
        getPendingGuideCommentCount(),
        getPendingProductReviewCount(),
      ]);
      return NextResponse.json({ count: commentCount + reviewCount });
    }

    const comments = await getAllGuideCommentsForAdmin();
    return NextResponse.json({ comments });
  } catch (err) {
    console.error('[api/admin/info-comments] GET failed', err);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}
