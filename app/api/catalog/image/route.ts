import { NextRequest, NextResponse } from 'next/server';
import { resolveLineItemImageUrl } from '@/lib/catalog/resolveLineItemImage';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['bouquet', 'product', 'plushyToy', 'balloon'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

function isAllowedType(value: string): value is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeRaw = (searchParams.get('type') ?? '').trim();
    const id = (searchParams.get('id') ?? '').trim();
    const size = (searchParams.get('size') ?? '').trim() || undefined;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const type: AllowedType = isAllowedType(typeRaw) ? typeRaw : 'bouquet';
    const imageUrl =
      (await resolveLineItemImageUrl({
        itemType: type,
        id,
        size,
        clientImageUrl: null,
      })) ?? null;

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error('[API] GET /api/catalog/image failed:', err);
    return NextResponse.json({ error: 'Failed to resolve image' }, { status: 500 });
  }
}
