import { NextRequest, NextResponse } from 'next/server';
import { upsertLineDraft, generateHandoffToken } from '@/lib/line-draft/store';
import { parseLineDraftPayload } from '@/lib/line-draft/validate';
import { searchCatalogItems } from '@/lib/line-catalog/searchCatalog';
import { getBaseUrl } from '@/lib/orders';
import { listOrdersByLineUserId } from '@/lib/orders';
import { getOrderDetailsUrl } from '@/lib/orders';
import type { Locale } from '@/lib/i18n';
import { logAgentApiEvent } from '@/lib/line-integration/agentApiLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE = '/api/agent/line';

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

type PostMeta = {
  action?: string;
  lineUserId?: string;
  error?: string;
  extra?: Record<string, unknown>;
};

async function handlePost(req: NextRequest, meta: PostMeta): Promise<NextResponse> {
  if (!requireAgentAuth(req)) {
    meta.error = 'unauthorized';
    return unauthorized();
  }

  if (!process.env.LINE_AGENT_SECRET?.trim()) {
    meta.error = 'LINE_AGENT_SECRET not configured';
    return NextResponse.json({ error: 'LINE_AGENT_SECRET is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    meta.error = 'invalid_json';
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    meta.error = 'invalid_body';
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const action = typeof b.action === 'string' ? b.action.trim() : '';
  meta.action = action || '(missing)';

  try {
    if (action === 'upsertDraft') {
      const lineUserId = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
      meta.lineUserId = lineUserId || undefined;
      if (!lineUserId) {
        meta.error = 'lineUserId is required';
        return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
      }
      const parsed = parseLineDraftPayload(b.draft);
      if (!parsed.ok) {
        meta.error = parsed.message;
        return NextResponse.json({ error: parsed.message }, { status: 400 });
      }
      const draftMeta = await upsertLineDraft(lineUserId, parsed.draft);
      meta.extra = { draftItemCount: parsed.draft.items.length };
      return NextResponse.json({ ok: true, expiresAt: draftMeta.expiresAt });
    }

    if (action === 'getHandoffUrl') {
      const lineUserId = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
      meta.lineUserId = lineUserId || undefined;
      if (!lineUserId) {
        meta.error = 'lineUserId is required';
        return NextResponse.json({ error: 'lineUserId is required' }, { status: 400 });
      }
      const lang = b.lang === 'th' || b.lang === 'en' ? (b.lang as Locale) : 'en';
      const { token } = await generateHandoffToken(lineUserId);
      const base = getBaseUrl();
      const url = `${base}/${lang}/cart?handoff=${encodeURIComponent(token)}`;
      meta.extra = { lang, baseHost: safeHost(base) };
      return NextResponse.json({ ok: true, url, handoffToken: token });
    }

    if (action === 'searchCatalog') {
      const q = typeof b.query === 'string' ? b.query : '';
      const limit = typeof b.limit === 'number' && b.limit > 0 ? Math.min(30, b.limit) : 15;
      const items = searchCatalogItems(q, limit);
      meta.extra = { queryLen: q.length, resultCount: items.length, limit };
      return NextResponse.json({ ok: true, items });
    }

    if (action === 'getOrderStatus') {
      const lineUserId = typeof b.lineUserId === 'string' ? b.lineUserId.trim() : '';
      meta.lineUserId = lineUserId || undefined;
      if (!lineUserId) {
        meta.error = 'lineUserId is required';
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
      meta.extra = { orderCount: summaries.length };
      return NextResponse.json({ ok: true, orders: summaries });
    }

    meta.error = 'unknown_action';
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    meta.error = msg;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return '(invalid base URL)';
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const meta: PostMeta = {};
  const response = await handlePost(req, meta);
  logAgentApiEvent({
    route: ROUTE,
    method: 'POST',
    status: response.status,
    ms: Date.now() - started,
    action: meta.action,
    lineUserId: meta.lineUserId,
    error: meta.error,
    extra: meta.extra,
  });
  return response;
}
