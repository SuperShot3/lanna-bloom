import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/adminRbac';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes

function safeFilenameFromPath(storagePath: string): string {
  const leaf = storagePath.split('/').pop() || 'image';
  return leaf.replace(/[^\w.\-()]+/g, '_');
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

  const storagePath = request.nextUrl.searchParams.get('path')?.trim() || '';
  if (!storagePath) return NextResponse.json({ error: 'path required' }, { status: 400 });

  // Tight scope: only catalog media paths (public bucket but downloads still require admin).
  if (
    !storagePath.startsWith('products/') &&
    !storagePath.startsWith('bouquets/') &&
    !storagePath.startsWith('hero/') &&
    !storagePath.startsWith('site-settings/')
  ) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const downloadParam = request.nextUrl.searchParams.get('download');
  const shouldDownload = downloadParam === '1' || downloadParam === 'true' || downloadParam === 'yes';
  const fallbackFileName = safeFilenameFromPath(storagePath);

  const { data, error } = await supabase.storage.from('catalog').createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
    download: shouldDownload ? fallbackFileName : undefined,
  });

  if (error || !data?.signedUrl) {
    console.error('[catalog-image-url] signed URL error:', error?.message);
    return NextResponse.json({ error: 'Failed to generate image URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}

