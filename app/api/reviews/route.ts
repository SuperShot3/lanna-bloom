import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

const MAX_NAME_LENGTH = 200;
const MAX_COMMENT_LENGTH = 2000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Name must be at most ${MAX_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment must be at most ${MAX_COMMENT_LENGTH} characters` },
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
      .from('customer_reviews')
      .insert({ name, comment, status: 'approved', rating: 5 })
      .select('id')
      .single();

    if (error) {
      console.error('[api/reviews] insert error:', error.message);
      return NextResponse.json(
        { error: 'Failed to save review' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (e) {
    console.error('[api/reviews] error:', e);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
