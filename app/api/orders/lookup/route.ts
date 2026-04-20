import { NextRequest, NextResponse } from 'next/server';
import { supabaseLookupOrdersByPhone, supabaseLookupOrdersByOrderId } from '@/lib/orders/supabaseStore';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkOrderLookupRateLimit } from '@/lib/rateLimit';

/** True if input looks like an order ID (e.g. contains "LB-" or letters). */
function looksLikeOrderId(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  if (t.toUpperCase().startsWith('LB-')) return true;
  return /[A-Za-z]/.test(t);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  const orderId = typeof b.orderId === 'string' ? b.orderId.trim() : '';
  const name = typeof b.name === 'string' ? b.name.trim() : undefined;

  const searchByOrderId = orderId
    ? true
    : phone
      ? looksLikeOrderId(phone)
      : false;
  const searchQuery = searchByOrderId ? (orderId || phone) : phone;
  const digits = searchQuery.replace(/\D/g, '');

  const rateLimitScope = searchByOrderId ? 'order-id' : 'phone';
  if (!checkOrderLookupRateLimit(ip, rateLimitScope)) {
    console.warn('[orders/lookup] rate-limited', { ip, scope: rateLimitScope });
    return NextResponse.json(
      { error: 'Too many lookup attempts. Please try again later.' },
      { status: 429 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Order lookup is not available.' },
      { status: 503 }
    );
  }

  if (!searchQuery) {
    return NextResponse.json(
      { error: 'Enter your phone number or order ID (e.g. LB-2025-XXXX)' },
      { status: 400 }
    );
  }

  if (searchByOrderId) {
    if (searchQuery.length < 6) {
      return NextResponse.json(
        { error: 'Order ID should be at least 6 characters' },
        { status: 400 }
      );
    }
  } else {
    if (digits.length < 9) {
      return NextResponse.json(
        { error: 'Phone number must have at least 9 digits' },
        { status: 400 }
      );
    }
  }

  try {
    const orders = searchByOrderId
      ? await supabaseLookupOrdersByOrderId(searchQuery)
      : await supabaseLookupOrdersByPhone(digits, name);
    return NextResponse.json({ orders });
  } catch (e) {
    console.error('[orders/lookup] error:', e);
    return NextResponse.json(
      { error: 'Could not look up orders. Please try again.' },
      { status: 500 }
    );
  }
}
