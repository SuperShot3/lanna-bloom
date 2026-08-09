import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { Review } from '@/lib/reviews';

/** Align with homepage / catalog ISR; keep reviews HTML cacheable. */
export const REVIEWS_REVALIDATE_SECONDS = 300;
export const REVIEWS_CACHE_TAG = 'customer-reviews';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

async function fetchCustomerReviewsFromDb(): Promise<Review[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('customer_reviews')
    .select('id, name, comment, created_at, rating, review_date')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => {
    const dateStr =
      row.review_date != null
        ? new Date(row.review_date).toISOString()
        : row.created_at ?? new Date().toISOString();
    return {
      id: row.id,
      name: row.name ?? '',
      initials: getInitials(row.name ?? ''),
      rating: typeof row.rating === 'number' ? row.rating : 5,
      text: row.comment ?? '',
      date: dateStr,
      location: '',
      featured: false,
    };
  });
}

/**
 * Fetches customer-submitted reviews from Supabase (approved only).
 * Cached so storefront pages that read reviews stay ISR/CDN-cacheable.
 */
export const getCustomerReviewsFromDb: () => Promise<Review[]> = unstable_cache(
  fetchCustomerReviewsFromDb,
  ['customer-reviews-approved'],
  {
    revalidate: REVIEWS_REVALIDATE_SECONDS,
    tags: [REVIEWS_CACHE_TAG],
  }
);
