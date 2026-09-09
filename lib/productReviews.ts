import { randomBytes } from 'crypto';
import { unstable_cache, revalidateTag } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { Locale } from '@/lib/i18n';
import {
  computeProductReviewStats,
  hashProductReviewToken,
  isDeliveredPaidOrderForReview,
  isProductReviewUuid,
  isProductReviewVerifyToken,
  PRODUCT_REVIEW_VERIFY_TTL_MS,
  type ProductReviewStats,
  type ProductReviewStatus,
} from '@/lib/productReviewsLogic';

export {
  computeProductReviewStats,
  hashProductReviewToken,
  isDeliveredPaidOrderForReview,
  isProductReviewUuid,
  isProductReviewVerifyToken,
  toProductJsonLdReviews,
  validateProductReviewInput,
  PRODUCT_JSON_LD_REVIEW_CAP,
  PRODUCT_REVIEW_MAX_EMAIL,
  PRODUCT_REVIEW_MAX_NAME,
  PRODUCT_REVIEW_MAX_TEXT,
  PRODUCT_REVIEW_MIN_TEXT,
} from '@/lib/productReviewsLogic';
export type {
  ProductJsonLdReview,
  ProductReviewStats,
  ProductReviewStatus,
} from '@/lib/productReviewsLogic';

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
  verifiedPurchase: boolean;
};

export type AdminProductReview = ProductReview & {
  authorEmail: string;
  orderId: string | null;
  bouquetName: string | null;
  bouquetSlug: string | null;
};

type ProductReviewRow = {
  id: string;
  bouquet_id: string;
  display_name: string;
  rating: number;
  review_text: string;
  locale: string | null;
  status: string;
  created_at: string;
  order_id?: string | null;
  author_email?: string | null;
};

function mapPublicRow(row: ProductReviewRow): ProductReview {
  return {
    id: row.id,
    bouquetId: row.bouquet_id,
    displayName: row.display_name,
    rating: row.rating,
    reviewText: row.review_text,
    locale: row.locale,
    status: row.status as ProductReviewStatus,
    createdAt: row.created_at,
    verifiedPurchase: Boolean(row.order_id),
  };
}

function generateVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

async function fetchApprovedProductReviews(bouquetId: string): Promise<ProductReview[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isProductReviewUuid(bouquetId)) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, bouquet_id, display_name, rating, review_text, locale, status, created_at, order_id')
    .eq('bouquet_id', bouquetId)
    .eq('status', 'approved')
    .not('email_verified_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    const missing = /schema cache|does not exist/i.test(error.message);
    if (!missing) {
      console.error('[productReviews] fetch approved failed:', error.message);
    }
    return [];
  }
  return (data ?? []).map(mapPublicRow);
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

export async function getBouquetNameForReviewEmail(
  bouquetId: string,
  locale: Locale | null
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isProductReviewUuid(bouquetId)) return 'your bouquet';
  const { data } = await supabase
    .from('catalog_bouquets')
    .select('name_en, name_th')
    .eq('id', bouquetId)
    .maybeSingle();
  if (!data) return 'your bouquet';
  const nameTh = typeof data.name_th === 'string' ? data.name_th.trim() : '';
  const nameEn = typeof data.name_en === 'string' ? data.name_en.trim() : '';
  if (locale === 'th' && nameTh) return nameTh;
  return nameEn || nameTh || 'your bouquet';
}

type ExistingReviewRow = {
  id: string;
  status: string;
};

async function findActiveReviewForEmail(
  bouquetId: string,
  authorEmail: string
): Promise<ExistingReviewRow | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, status')
    .eq('bouquet_id', bouquetId)
    .eq('author_email', authorEmail)
    .in('status', ['pending_email', 'pending', 'approved'])
    .maybeSingle();
  if (error) {
    console.error('[productReviews] find active by email failed:', error.message);
    return null;
  }
  return data as ExistingReviewRow | null;
}

export async function submitProductReviewForEmailConfirmation(input: {
  bouquetId: string;
  displayName: string;
  authorEmail: string;
  rating: number;
  reviewText: string;
  locale: Locale | null;
}): Promise<
  | { ok: true; token: string; displayName: string; bouquetId: string }
  | { ok: false; conflict?: boolean }
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false };

  const existing = await findActiveReviewForEmail(input.bouquetId, input.authorEmail);
  if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
    return { ok: false, conflict: true };
  }

  const token = generateVerifyToken();
  const tokenHash = hashProductReviewToken(token);
  const expiresAt = new Date(Date.now() + PRODUCT_REVIEW_VERIFY_TTL_MS).toISOString();
  const payload = {
    bouquet_id: input.bouquetId,
    display_name: input.displayName,
    author_email: input.authorEmail,
    rating: input.rating,
    review_text: input.reviewText,
    locale: input.locale,
    status: 'pending_email',
    email_verified_at: null,
    verify_token_hash: tokenHash,
    verify_expires_at: expiresAt,
    order_id: null,
  };

  if (existing?.status === 'pending_email') {
    const { error } = await supabase.from('product_reviews').update(payload).eq('id', existing.id);
    if (error) {
      console.error('[productReviews] rotate pending_email failed:', error.message);
      return { ok: false };
    }
    return { ok: true, token, displayName: input.displayName, bouquetId: input.bouquetId };
  }

  const { error } = await supabase.from('product_reviews').insert(payload);
  if (error) {
    if (error.code === '23505') return { ok: false, conflict: true };
    console.error('[productReviews] insert pending_email failed:', error.message);
    return { ok: false };
  }
  return { ok: true, token, displayName: input.displayName, bouquetId: input.bouquetId };
}

async function findDeliveredOrderIdForReview(
  email: string,
  bouquetId: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('order_items')
    .select(
      'bouquet_id, order_id, orders!inner(order_id, payment_status, order_status, fulfillment_status, customer_email, created_at)'
    )
    .eq('bouquet_id', bouquetId)
    .eq('orders.payment_status', 'PAID');

  if (error) {
    console.error('[productReviews] delivered order lookup failed:', error.message);
    return null;
  }

  type Joined = {
    bouquet_id: string | null;
    order_id: string;
    orders:
      | {
          order_id: string;
          payment_status: string | null;
          order_status: string | null;
          fulfillment_status: string | null;
          customer_email: string | null;
          created_at: string | null;
        }
      | {
          order_id: string;
          payment_status: string | null;
          order_status: string | null;
          fulfillment_status: string | null;
          customer_email: string | null;
          created_at: string | null;
        }[];
  };

  const matches: { orderId: string; createdAt: string }[] = [];
  for (const row of (data ?? []) as Joined[]) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    if (!order) continue;
    if (
      !isDeliveredPaidOrderForReview({
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        fulfillmentStatus: order.fulfillment_status,
        customerEmail: order.customer_email,
        itemBouquetId: row.bouquet_id,
        reviewEmail: email,
        reviewBouquetId: bouquetId,
      })
    ) {
      continue;
    }
    matches.push({
      orderId: order.order_id || row.order_id,
      createdAt: order.created_at ?? '',
    });
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return matches[0]?.orderId ?? null;
}

export async function confirmProductReviewByToken(
  token: string
): Promise<{ ok: true; locale: string | null } | { ok: false }> {
  const trimmed = token.trim();
  if (!isProductReviewVerifyToken(trimmed)) return { ok: false };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false };

  const tokenHash = hashProductReviewToken(trimmed);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, bouquet_id, author_email, locale, status, verify_expires_at')
    .eq('verify_token_hash', tokenHash)
    .eq('status', 'pending_email')
    .maybeSingle();

  if (error) {
    console.error('[productReviews] confirm lookup failed:', error.message);
    return { ok: false };
  }
  if (!data) return { ok: false };
  const expiresAt = typeof data.verify_expires_at === 'string' ? data.verify_expires_at : '';
  if (!expiresAt || expiresAt < now) return { ok: false };

  const orderId = await findDeliveredOrderIdForReview(data.author_email, data.bouquet_id);

  const { data: updated, error: updateError } = await supabase
    .from('product_reviews')
    .update({
      status: 'pending',
      email_verified_at: now,
      verify_token_hash: null,
      verify_expires_at: null,
      order_id: orderId,
    })
    .eq('id', data.id)
    .eq('status', 'pending_email')
    .select('id');

  if (updateError || !updated?.length) {
    console.error('[productReviews] confirm update failed:', updateError?.message);
    return { ok: false };
  }
  return { ok: true, locale: data.locale ?? null };
}

export async function listProductReviewsForAdmin(): Promise<AdminProductReview[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('product_reviews')
    .select(
      'id, bouquet_id, display_name, author_email, rating, review_text, locale, status, created_at, order_id'
    )
    .in('status', ['pending', 'approved', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[productReviews] admin list failed:', error.message);
    return [];
  }

  const rows = data ?? [];
  const bouquetIds = Array.from(new Set(rows.map((r) => r.bouquet_id).filter(Boolean)));
  const bouquetMap = new Map<string, { name: string | null; slug: string | null }>();
  if (bouquetIds.length > 0) {
    const { data: bouquets, error: bouquetError } = await supabase
      .from('catalog_bouquets')
      .select('id, name_en, slug_en')
      .in('id', bouquetIds);
    if (bouquetError) {
      console.error('[productReviews] admin bouquet lookup failed:', bouquetError.message);
    } else {
      for (const b of bouquets ?? []) {
        bouquetMap.set(b.id, {
          name: typeof b.name_en === 'string' ? b.name_en : null,
          slug: typeof b.slug_en === 'string' ? b.slug_en : null,
        });
      }
    }
  }

  return rows.map((row) => {
    const bouquet = bouquetMap.get(row.bouquet_id);
    return {
      ...mapPublicRow(row),
      authorEmail: row.author_email ?? '',
      orderId: row.order_id ?? null,
      bouquetName: bouquet?.name ?? null,
      bouquetSlug: bouquet?.slug ?? null,
    };
  });
}

export async function getPendingProductReviewCount(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('product_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) {
    console.error('[productReviews] pending count failed:', error.message);
    return 0;
  }
  return count ?? 0;
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
    .in('status', ['pending', 'approved', 'rejected'])
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
