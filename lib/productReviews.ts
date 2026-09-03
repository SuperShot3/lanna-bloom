import { unstable_cache, revalidateTag } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { Locale } from '@/lib/i18n';
import {
  computeProductReviewStats,
  isProductReviewUuid,
  type ProductReviewStats,
  type ProductReviewStatus,
} from '@/lib/productReviewsLogic';

export {
  computeProductReviewStats,
  isProductReviewUuid,
  validateProductReviewInput,
  PRODUCT_REVIEW_MAX_NAME,
  PRODUCT_REVIEW_MAX_TEXT,
  PRODUCT_REVIEW_MIN_TEXT,
} from '@/lib/productReviewsLogic';
export type { ProductReviewStats, ProductReviewStatus } from '@/lib/productReviewsLogic';

export const PRODUCT_REVIEWS_CACHE_TAG = 'product-reviews';
export const PRODUCT_REVIEWS_REVALIDATE_SECONDS = 120;

export type ProductReview = {
  id: string;
  bouquetId: string;
  displayName: string;
  rating: number;
  reviewText: string;
  locale: string | null;
  status: ProductReviewStatus;
  createdAt: string;
};

function mapRow(row: {
  id: string;
  bouquet_id: string;
  display_name: string;
  rating: number;
  review_text: string;
  locale: string | null;
  status: string;
  created_at: string;
}): ProductReview {
  return {
    id: row.id,
    bouquetId: row.bouquet_id,
    displayName: row.display_name,
    rating: row.rating,
    reviewText: row.review_text,
    locale: row.locale,
    status: row.status as ProductReviewStatus,
    createdAt: row.created_at,
  };
}

async function fetchApprovedProductReviews(bouquetId: string): Promise<ProductReview[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isProductReviewUuid(bouquetId)) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, bouquet_id, display_name, rating, review_text, locale, status, created_at')
    .eq('bouquet_id', bouquetId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    const missing = /schema cache|does not exist/i.test(error.message);
    if (!missing) {
      console.error('[productReviews] fetch approved failed:', error.message);
    }
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getApprovedProductReviews(bouquetId: string): Promise<ProductReview[]> {
  if (!isProductReviewUuid(bouquetId)) return [];
  return unstable_cache(
    () => fetchApprovedProductReviews(bouquetId),
    ['product-reviews-approved', bouquetId],
    {
      revalidate: PRODUCT_REVIEWS_REVALIDATE_SECONDS,
      tags: [PRODUCT_REVIEWS_CACHE_TAG, `${PRODUCT_REVIEWS_CACHE_TAG}:${bouquetId}`],
    }
  )();
}

export async function getProductReviewStats(bouquetId: string): Promise<ProductReviewStats> {
  const reviews = await getApprovedProductReviews(bouquetId);
  return computeProductReviewStats(reviews.map((r) => r.rating));
}

export async function bouquetIsApprovedForReviews(bouquetId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isProductReviewUuid(bouquetId)) return false;
  const { data, error } = await supabase
    .from('catalog_bouquets')
    .select('id, status')
    .eq('id', bouquetId)
    .maybeSingle();
  if (error || !data) return false;
  return data.status === 'approved';
}

export async function insertPendingProductReview(input: {
  bouquetId: string;
  displayName: string;
  rating: number;
  reviewText: string;
  locale: Locale | null;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from('product_reviews')
    .insert({
      bouquet_id: input.bouquetId,
      display_name: input.displayName,
      rating: input.rating,
      review_text: input.reviewText,
      locale: input.locale,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[productReviews] insert pending failed:', error?.message);
    return { ok: false };
  }
  return { ok: true, id: data.id };
}

export async function listProductReviewsForAdmin(): Promise<ProductReview[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, bouquet_id, display_name, rating, review_text, locale, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[productReviews] admin list failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function updateProductReviewStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<{ ok: true; bouquetId: string } | { ok: false; notFound?: boolean }> {
  if (!isProductReviewUuid(id)) return { ok: false };
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from('product_reviews')
    .update({ status })
    .eq('id', id)
    .select('id, bouquet_id')
    .maybeSingle();

  if (error) {
    console.error('[productReviews] update status failed:', error.message);
    return { ok: false };
  }
  if (!data) return { ok: false, notFound: true };
  revalidateTag(PRODUCT_REVIEWS_CACHE_TAG);
  revalidateTag(`${PRODUCT_REVIEWS_CACHE_TAG}:${data.bouquet_id}`);
  return { ok: true, bouquetId: data.bouquet_id };
}

export async function deleteProductReview(
  id: string
): Promise<{ ok: true; bouquetId?: string } | { ok: false; notFound?: boolean }> {
  if (!isProductReviewUuid(id)) return { ok: false };
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', id)
    .select('id, bouquet_id');

  if (error) {
    console.error('[productReviews] delete failed:', error.message);
    return { ok: false };
  }
  if (!data?.length) return { ok: false, notFound: true };
  const bouquetId = data[0]?.bouquet_id;
  revalidateTag(PRODUCT_REVIEWS_CACHE_TAG);
  if (bouquetId) revalidateTag(`${PRODUCT_REVIEWS_CACHE_TAG}:${bouquetId}`);
  return { ok: true, bouquetId };
}
