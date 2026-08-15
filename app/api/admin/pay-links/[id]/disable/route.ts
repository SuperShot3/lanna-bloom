import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { disablePayLinkDraft } from '@/lib/payLinks/expirePayLinkDrafts';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const draftId = id?.trim() ?? '';
  if (!draftId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const result = await disablePayLinkDraft(draftId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
