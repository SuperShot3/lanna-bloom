import { NextRequest, NextResponse } from 'next/server';
import { supabaseLookupOrdersByPhone } from '@/lib/orders/supabaseStore';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkOrderLookupRateLimit } from '@/lib/rateLimit';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkOrderLookupRateLimit(ip)) {
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
  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) {
    return NextResponse.json(
      { error: 'Phone number must have at least 8 digits' },
      { status: 400 }
    );
  }

  const name = typeof b.name === 'string' ? b.name.trim() : undefined;

  try {
    const orders = await supabaseLookupOrdersByPhone(digits, name);
    return NextResponse.json({ orders });
  } catch (e) {
    console.error('[orders/lookup] error:', e);
    return NextResponse.json(
      { error: 'Could not look up orders. Please try again.' },
      { status: 500 }
    );
  }
}
