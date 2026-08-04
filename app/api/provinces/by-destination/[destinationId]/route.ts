import { NextRequest, NextResponse } from 'next/server';
import { getPublicProvinceByDestinationId } from '@/lib/provinces/queries';

export const dynamic = 'force-dynamic';

const DEST_RE = /^[A-Z][A-Z0-9_]{1,40}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ destinationId: string }> }
) {
  const destinationId = (await params).destinationId.trim().toUpperCase();
  if (!DEST_RE.test(destinationId)) {
    return NextResponse.json({ error: 'Invalid destination id' }, { status: 400 });
  }

  const result = await getPublicProvinceByDestinationId(destinationId);
  if (!result.ok) {
    if (result.error === 'Not found' || result.error === 'Database not configured') {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to load province' }, { status: 500 });
  }

  return NextResponse.json(
    { province: result.province },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
