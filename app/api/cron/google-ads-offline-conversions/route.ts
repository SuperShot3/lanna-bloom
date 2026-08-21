import { NextRequest, NextResponse } from 'next/server';
import { uploadPendingGoogleAdsOfflineConversions } from '@/lib/attribution/uploadPending';

/**
 * Vercel Cron: every 5 minutes — ingest pending Google Ads Data Manager conversions.
 * No-ops when Data Manager / conversion action is not configured. Rows stay pending.
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

  try {
    const result = await uploadPendingGoogleAdsOfflineConversions();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'upload_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
