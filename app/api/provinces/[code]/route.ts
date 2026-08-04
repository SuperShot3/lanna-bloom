import { NextRequest, NextResponse } from 'next/server';
import { getPublicProvinceByCode } from '@/lib/provinces/queries';

export const dynamic = 'force-dynamic';

const CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const code = (await params).code.trim().toLowerCase();
  if (!CODE_RE.test(code) || code.length > 80) {
    return NextResponse.json({ error: 'Invalid province code' }, { status: 400 });
  }

  const result = await getPublicProvinceByCode(code);
  if (!result.ok) {
    if (result.error === 'Not found') {
      return NextResponse.json({ error: 'Province not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to load province' }, { status: 500 });
  }

  return NextResponse.json(
    { province: result.province },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
