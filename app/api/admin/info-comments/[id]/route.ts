import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { deleteGuideComment, updateGuideCommentStatus } from '@/lib/info/guideComments/write';
import { validateAdminStatus, validateCommentId } from '@/lib/info/guideComments/validate';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id: raw } = await params;
  const commentId = validateCommentId(raw);
  if (!commentId) {
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const status = validateAdminStatus((body as Record<string, unknown>).status);
  if (!status) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const result = await updateGuideCommentStatus(commentId, status);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    console.error('[api/admin/info-comments/[id]] PATCH failed:', result.error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id: raw } = await params;
  const commentId = validateCommentId(raw);
  if (!commentId) {
    return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
  }

  const result = await deleteGuideComment(commentId);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    console.error('[api/admin/info-comments/[id]] DELETE failed:', result.error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
