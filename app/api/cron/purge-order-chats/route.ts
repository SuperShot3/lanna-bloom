import { NextRequest, NextResponse } from 'next/server';
import { isOrderChatEnabled } from '@/lib/orderChat/enabled';
import { purgeExpiredChats } from '@/lib/orderChat/store';

/**
 * Vercel Cron: permanently delete order chats past purge_after (2h after DELIVERED).
 * Protect with CRON_SECRET in Authorization: Bearer <secret> or x-cron-secret.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const h = request.headers.get('x-cron-secret')?.trim();
  if (auth !== expected && h !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isOrderChatEnabled()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'ORDER_CHAT_ENABLED is off' });
  }

  const result = await purgeExpiredChats();
  return NextResponse.json({
    ok: true,
    ...result,
    ranAt: new Date().toISOString(),
  });
}
