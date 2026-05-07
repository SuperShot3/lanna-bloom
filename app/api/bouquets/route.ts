import { NextRequest, NextResponse } from 'next/server';
import {
  getPopularCatalogItemsFromSanityPaginated,
  getBouquetsFromSanityPaginated,
} from '@/lib/sanity';
import { DELIVERY_DESTINATIONS, type DeliveryDestinationId } from '@/lib/delivery/markets';

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

    const kind = searchParams.get('kind');
    if (kind === 'bouquets') {
      const destRaw = searchParams.get('destination')?.trim() ?? '';
      const destination: DeliveryDestinationId = (
        DELIVERY_DESTINATIONS as readonly string[]
      ).includes(destRaw)
        ? (destRaw as DeliveryDestinationId)
        : 'CHIANG_MAI';
      const bouquets = await getBouquetsFromSanityPaginated(offset, limit, destination);
      const hasMore = bouquets.length === limit;
      return NextResponse.json({ bouquets, hasMore });
    }

    const items = await getPopularCatalogItemsFromSanityPaginated(offset, limit);
    const hasMore = items.length === limit;

    return NextResponse.json({ items, hasMore });
  } catch (err) {
    console.error('[API] GET /api/bouquets failed:', err);
    return NextResponse.json(
      { error: 'Failed to load popular items' },
      { status: 500 }
    );
  }
}
