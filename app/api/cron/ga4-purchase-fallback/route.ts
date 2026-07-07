import { NextRequest, NextResponse } from 'next/server';
import { runGa4PurchaseFallbackCron } from '@/lib/analytics/ga4PurchaseFallback';

/**
 * Vercel Cron: every 2 minutes — processes GA4 Measurement Protocol purchase fallbacks.
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

  const result = await runGa4PurchaseFallbackCron();
  return NextResponse.json({ ok: true, ...result });
}
