import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ValidatedCommentInput } from './validate';

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export async function hasRecentDuplicateComment(input: ValidatedCommentInput): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from('guide_comments')
    .select('id')
    .eq('guide_slug', input.guideSlug)
    .eq('visitor_token_hash', input.visitorTokenHash)
    .eq('body', input.body)
    .gte('created_at', since)
    .limit(1);

  if (error) {
    console.error('[guideComments/write] duplicate check error:', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export async function insertPendingGuideComment(
  input: ValidatedCommentInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Service unavailable' };
  }

  const { error } = await supabase.from('guide_comments').insert({
    guide_slug: input.guideSlug,
    author_name: input.authorName,
    author_email: input.authorEmail,
    body: input.body,
    status: 'pending',
    locale: input.locale,
    visitor_token_hash: input.visitorTokenHash,
  });

  if (error) {
    console.error('[guideComments/write] insert error:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function insertGuideCommentReaction(
  commentId: string,
  visitorTokenHash: string
): Promise<{ ok: true; helpfulCount: number } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Service unavailable' };
  }

  const { error } = await supabase.from('guide_comment_reactions').insert({
    comment_id: commentId,
    visitor_token_hash: visitorTokenHash,
  });

  if (error) {
    // Unique violation = already liked; return current count
    if (error.code === '23505') {
      const { count } = await supabase
        .from('guide_comment_reactions')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', commentId);
      return { ok: true, helpfulCount: count ?? 0 };
    }
    console.error('[guideComments/write] reaction insert error:', error.message);
    return { ok: false, error: error.message };
  }

  const { count } = await supabase
    .from('guide_comment_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', commentId);

  return { ok: true, helpfulCount: count ?? 1 };
}

export async function updateGuideCommentStatus(
  commentId: string,
  status: 'approved' | 'hidden'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Service unavailable' };
  }

  const { data, error } = await supabase
    .from('guide_comments')
    .update({ status })
    .eq('id', commentId)
    .select('id');

  if (error) {
    console.error('[guideComments/write] status update error:', error.message);
    return { ok: false, error: error.message };
  }

  if (!data?.length) {
    return { ok: false, error: 'Not found' };
  }

  return { ok: true };
}

export async function deleteGuideComment(
  commentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'Service unavailable' };
  }

  const { data, error } = await supabase
    .from('guide_comments')
    .delete()
    .eq('id', commentId)
    .select('id');

  if (error) {
    console.error('[guideComments/write] delete error:', error.message);
    return { ok: false, error: error.message };
  }

  if (!data?.length) {
    return { ok: false, error: 'Not found' };
  }

  return { ok: true };
}
