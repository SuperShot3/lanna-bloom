import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isCommentableGuideSlug } from './allowlist';

export type PublicGuideComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  helpfulCount: number;
};

export type AdminGuideComment = {
  id: string;
  guideSlug: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  status: 'pending' | 'approved' | 'hidden';
  locale: string;
  createdAt: string;
  helpfulCount: number;
};

async function getHelpfulCounts(commentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (commentIds.length === 0) return counts;

  const supabase = getSupabaseAdmin();
  if (!supabase) return counts;

  const { data, error } = await supabase
    .from('guide_comment_reactions')
    .select('comment_id')
    .in('comment_id', commentIds);

  if (error) {
    console.error('[guideComments/read] reaction count error:', error.message);
    return counts;
  }

  for (const row of data ?? []) {
    const id = row.comment_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function getApprovedGuideComments(guideSlug: string): Promise<PublicGuideComment[]> {
  if (!isCommentableGuideSlug(guideSlug)) return [];

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('guide_comments')
    .select('id, author_name, body, created_at')
    .eq('guide_slug', guideSlug)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[guideComments/read] approved list error:', error.message);
    return [];
  }

  const rows = data ?? [];
  const counts = await getHelpfulCounts(rows.map((r) => r.id));

  return rows.map((row) => ({
    id: row.id,
    authorName: row.author_name ?? '',
    body: row.body ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    helpfulCount: counts.get(row.id) ?? 0,
  }));
}

export async function getAllGuideCommentsForAdmin(): Promise<AdminGuideComment[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('guide_comments')
    .select('id, guide_slug, author_name, author_email, body, status, locale, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[guideComments/read] admin list error:', error.message);
    return [];
  }

  const rows = data ?? [];
  const counts = await getHelpfulCounts(rows.map((r) => r.id));

  return rows.map((row) => ({
    id: row.id,
    guideSlug: row.guide_slug ?? '',
    authorName: row.author_name ?? '',
    authorEmail: row.author_email ?? null,
    body: row.body ?? '',
    status: row.status as AdminGuideComment['status'],
    locale: row.locale ?? 'en',
    createdAt: row.created_at ?? new Date().toISOString(),
    helpfulCount: counts.get(row.id) ?? 0,
  }));
}

export async function getPendingGuideCommentCount(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('guide_comments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('[guideComments/read] pending count error:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getApprovedCommentById(
  commentId: string
): Promise<{ id: string; status: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('guide_comments')
    .select('id, status')
    .eq('id', commentId)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, status: data.status };
}

export async function getHelpfulCount(commentId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('guide_comment_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', commentId);

  if (error) {
    console.error('[guideComments/read] helpful count error:', error.message);
    return 0;
  }
  return count ?? 0;
}
