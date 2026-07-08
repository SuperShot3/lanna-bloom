import { NextRequest, NextResponse } from 'next/server';
import { runAbandonedCheckoutEmailCron } from '@/lib/email/abandonedCheckoutCron';

/**
 * Vercel Cron: every 30 minutes — set in vercel.json.
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
  const result = await runAbandonedCheckoutEmailCron();
  return NextResponse.json({ ok: true, ...result });
}
