import { NextRequest, NextResponse } from 'next/server';
import { getCatalogBouquetById } from '@/lib/catalogReads';

export const dynamic = 'force-dynamic';

const MAX_IDS = 40;

/**
 * Public, non-sensitive catalog facets for cart delivery constraints.
 * Returns only delivery_options — never prices or PII.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get('ids') ?? '').trim();
    if (!raw) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }

    const ids = [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ].slice(0, MAX_IDS);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
    }

    const options: Record<string, string[]> = {};
    await Promise.all(
      ids.map(async (id) => {
        const bouquet = await getCatalogBouquetById(id);
        if (!bouquet) return;
        options[id] = Array.isArray(bouquet.deliveryOptions)
          ? bouquet.deliveryOptions.filter((v): v is string => typeof v === 'string')
          : [];
      })
    );

    return NextResponse.json({ options });
  } catch (err) {
    console.error('[API] GET /api/catalog/bouquet-delivery-options failed:', err);
    return NextResponse.json({ error: 'Failed to resolve delivery options' }, { status: 500 });
  }
}
