import { NextRequest, NextResponse } from 'next/server';
import { getPopularBouquetsFromSanityPaginated } from '@/lib/sanity';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );

    const bouquets = await getPopularBouquetsFromSanityPaginated(offset, limit);
    const hasMore = bouquets.length === limit;

    return NextResponse.json({ bouquets, hasMore });
  } catch (err) {
    console.error('[API] GET /api/bouquets failed:', err);
    return NextResponse.json(
      { error: 'Failed to load bouquets' },
      { status: 500 }
    );
  }
}
