import { NextRequest, NextResponse } from 'next/server';
import { upsertLineDraft, generateHandoffToken } from '@/lib/line-draft/store';
import { parseLineDraftPayload } from '@/lib/line-draft/validate';
import { searchCatalogItems } from '@/lib/line-catalog/searchCatalog';
import { getBaseUrl } from '@/lib/orders';
import { listOrdersByLineUserId } from '@/lib/orders';
import { getOrderDetailsUrl } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function requireAgentAuth(req: NextRequest): boolean {
  const expected = process.env.LINE_AGENT_SECRET?.trim();
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === expected;
}

export async function POST(req: NextRequest) {
  if (!requireAgentAuth(req)) {
    return unauthorized();
  }

  if (!process.env.LINE_AGENT_SECRET?.trim()) {
    return NextResponse.json({ error: 'LINE_AGENT_SECRET is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const action = typeof b.action === 'string' ? b.action.trim() : '';

  try {
    if (action === 'upsertDraft') {
      const lineUserId = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
      if (!lineUserId) {
        return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
      }
      const parsed = parseLineDraftPayload(b.draft);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.message }, { status: 400 });
      }
      const meta = await upsertLineDraft(lineUserId, parsed.draft);
      return NextResponse.json({ ok: true, expiresAt: meta.expiresAt });
    }

    if (action === 'getHandoffUrl') {
      const lineUserId = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
      if (!lineUserId) {
        return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
      }
      const lang = b.lang === 'th' || b.lang === 'en' ? (b.lang as Locale) : 'en';
      const { token } = await generateHandoffToken(lineUserId);
      const base = getBaseUrl();
      const url = `${base}/${lang}/cart?handoff=${encodeURIComponent(token)}`;
      return NextResponse.json({ ok: true, url, handoffToken: token });
    }

    if (action === 'searchCatalog') {
      const q = typeof b.query === 'string' ? b.query : '';
      const limit = typeof b.limit === 'number' && b.limit > 0 ? Math.min(30, b.limit) : 15;
      const items = searchCatalogItems(q, limit);
      return NextResponse.json({ ok: true, items });
    }

    if (action === 'getOrderStatus') {
      const lineUserId = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
      if (!lineUserId) {
        return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
      }
      const orders = await listOrdersByLineUserId(lineUserId, 5);
      const summaries = orders.map((o) => ({
        orderId: o.orderId,
        orderUrl: getOrderDetailsUrl(o.orderId),
        paymentStatus: o.status,
        fulfillmentStatus: o.fulfillmentStatus,
        grandTotal: o.pricing?.grandTotal,
        createdAt: o.createdAt,
      }));
      return NextResponse.json({ ok: true, orders: summaries });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
