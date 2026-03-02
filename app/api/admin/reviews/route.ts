import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/adminRbac';

const MAX_NAME_LENGTH = 200;
const MAX_COMMENT_LENGTH = 2000;

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['OWNER', 'MANAGER']);
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
    const ratingRaw = body?.rating;
    const reviewDateRaw = body?.review_date;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!comment) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Name must be at most ${MAX_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Review text must be at most ${MAX_COMMENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    let rating: number = 5;
    if (ratingRaw != null) {
      const r = typeof ratingRaw === 'number' ? ratingRaw : parseInt(String(ratingRaw), 10);
      if (r >= 1 && r <= 5) rating = r;
    }

    let review_date: string | null = null;
    if (reviewDateRaw != null && reviewDateRaw !== '') {
      const d = new Date(String(reviewDateRaw).trim());
      if (!Number.isNaN(d.getTime())) {
        review_date = d.toISOString().slice(0, 10);
      }
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('customer_reviews')
      .insert({ name, comment, status: 'approved', rating, review_date })
      .select('id')
      .single();

    if (error) {
      console.error('[api/admin/reviews] insert error:', error.message);
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (e) {
    console.error('[api/admin/reviews] error:', e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
