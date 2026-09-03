import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { updateProductReviewStatus } from '@/lib/productReviews';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id: raw } = await params;
  const id = raw?.trim() ?? '';
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid review id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const status =
    body && typeof body === 'object' && 'status' in body
      ? String((body as { status?: unknown }).status)
      : '';
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 });
  }

  const result = await updateProductReviewStatus(id, status);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.notFound ? 'Review not found' : 'Failed to update review' },
      { status: result.notFound ? 404 : 500 }
    );
  }
  return NextResponse.json({ success: true });
}
