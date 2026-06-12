import { NextRequest, NextResponse } from 'next/server';
import {
  CUSTOM_ORDER_REFERENCE_IMAGE_RETENTION_DAYS,
  deleteCustomOrderReferenceImagesOlderThan,
} from '@/lib/customOrder/uploadReferenceImage';

/**
 * Vercel Cron: remove old custom-order reference images from public Blob storage.
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

  const cutoff = new Date(Date.now() - CUSTOM_ORDER_REFERENCE_IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await deleteCustomOrderReferenceImagesOlderThan(cutoff);

  return NextResponse.json({
    ok: true,
    retentionDays: CUSTOM_ORDER_REFERENCE_IMAGE_RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    ...result,
  });
}
