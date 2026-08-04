import { NextRequest, NextResponse } from 'next/server';
import { getPublicProvinceByCode, listPublicProvinces } from '@/lib/provinces/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Sanitized public list — never includes internal_notes. */
export async function GET(request: NextRequest) {
  const codeParam = request.nextUrl.searchParams.get('code')?.trim().toLowerCase();

  if (codeParam) {
    if (!CODE_RE.test(codeParam) || codeParam.length > 80) {
      return NextResponse.json({ error: 'Invalid province code' }, { status: 400 });
    }
    const result = await getPublicProvinceByCode(codeParam);
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

  const result = await listPublicProvinces();
  if (!result.ok) {
    return NextResponse.json({ error: 'Failed to load provinces' }, { status: 500 });
  }
  return NextResponse.json(
    { provinces: result.provinces },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
