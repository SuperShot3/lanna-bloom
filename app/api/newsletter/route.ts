import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendNewsletterNotificationEmail } from '@/lib/orderEmail';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Honeypot field names - if any is filled, treat as bot and return generic success */
const HONEYPOT_FIELDS = ['company', 'website', 'url', 'phone_extra'];

interface NewsletterBody {
  email?: string;
  source?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NewsletterBody;
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Honeypot: if any bot-trap field is filled, return generic success silently
    for (const field of HONEYPOT_FIELDS) {
      const val = body[field];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return NextResponse.json({ success: true });
      }
    }

    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const email = rawEmail.trim().toLowerCase();
    const source =
      typeof body.source === 'string' && body.source.trim()
        ? body.source.trim().slice(0, 100)
        : 'footer';

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, source, status: 'active' })
      .select('id, created_at')
      .single();

    if (error) {
      // Unique constraint violation = duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { success: true, message: 'already_subscribed' },
          { status: 200 }
        );
      }
      console.error('[api/newsletter] insert error:', error.message);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    // Send notification only on successful new insert
    const createdAt = data?.created_at
      ? new Date(data.created_at)
      : new Date();
    await sendNewsletterNotificationEmail(email, source, createdAt);

    return NextResponse.json({
      success: true,
      message: 'subscribed',
      id: data?.id,
    });
  } catch (e) {
    console.error('[api/newsletter] error:', e);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
