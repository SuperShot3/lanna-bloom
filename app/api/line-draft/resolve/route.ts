import { NextRequest, NextResponse } from 'next/server';
import { resolveHandoffToken } from '@/lib/line-draft/store';
import { logLineIntegrationEvent } from '@/lib/line-integration/log';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
  if (!token) {
    await logLineIntegrationEvent('handoff_rejected', { extra: { reason: 'missing_token' } });
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  }

  const resolved = await resolveHandoffToken(token);
  if (!resolved) {
    await logLineIntegrationEvent('handoff_rejected', { extra: { reason: 'not_found_or_expired' } });
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  }

  return NextResponse.json({
    lineUserId: resolved.lineUserId,
    draft: resolved.draft,
  });
}
