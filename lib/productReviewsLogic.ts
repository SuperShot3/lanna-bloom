import { createHash } from 'crypto';
import { isValidLocale, type Locale } from '@/lib/i18n';

export const PRODUCT_REVIEW_MAX_NAME = 80;
export const PRODUCT_REVIEW_MAX_TEXT = 1200;
export const PRODUCT_REVIEW_MIN_TEXT = 8;
export const PRODUCT_REVIEW_MAX_EMAIL = 254;
export const PRODUCT_REVIEW_VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
export const PRODUCT_JSON_LD_REVIEW_CAP = 50;
export const PRODUCT_REVIEW_TOKEN_RE = /^[a-f0-9]{64}$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProductReviewStatus = 'pending_email' | 'pending' | 'approved' | 'rejected';

export type ProductReviewStats = {
  average: number;
  count: number;
};

export type ProductJsonLdReview = {
  authorName: string;
  rating: number;
  reviewBody: string;
  datePublished: string;
};

export function isProductReviewUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

export function computeProductReviewStats(ratings: number[]): ProductReviewStats {
  const valid = ratings.filter((r) => Number.isInteger(r) && r >= 1 && r <= 5);
  if (valid.length === 0) return { average: 0, count: 0 };
  const sum = valid.reduce((acc, n) => acc + n, 0);
  return {
    average: Math.round((sum / valid.length) * 10) / 10,
    count: valid.length,
  };
}

function stripControlChars(value: string): string {
  return value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function normalizeProductReviewEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function hashProductReviewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isProductReviewVerifyToken(token: string): boolean {
  return PRODUCT_REVIEW_TOKEN_RE.test(token.trim());
}

export function isDeliveredPaidOrderForReview(input: {
  paymentStatus: string | null;
  orderStatus: string | null;
  fulfillmentStatus: string | null;
  customerEmail: string | null;
  itemBouquetId: string | null;
  reviewEmail: string;
  reviewBouquetId: string;
}): boolean {
  if (String(input.paymentStatus ?? '').toUpperCase() !== 'PAID') return false;
  const email = normalizeProductReviewEmail(input.customerEmail ?? '');
  if (!email || email !== normalizeProductReviewEmail(input.reviewEmail)) return false;
  if ((input.itemBouquetId ?? '').trim() !== input.reviewBouquetId.trim()) return false;
  const orderStatus = String(input.orderStatus ?? '').toUpperCase();
  const fulfillment = String(input.fulfillmentStatus ?? '').toLowerCase();
  return orderStatus === 'DELIVERED' || fulfillment === 'delivered';
}

export function toProductJsonLdReviews(
  reviews: Array<{
    displayName: string;
    rating: number;
    reviewText: string;
    createdAt: string;
  }>,
  cap = PRODUCT_JSON_LD_REVIEW_CAP
): ProductJsonLdReview[] {
  return reviews.slice(0, cap).map((review) => ({
    authorName: review.displayName,
    rating: review.rating,
    reviewBody: review.reviewText,
    datePublished: review.createdAt,
  }));
}

export function validateProductReviewInput(input: {
  bouquetId?: string;
  displayName?: string;
  authorEmail?: string;
  rating?: unknown;
  reviewText?: string;
  locale?: string;
}):
  | {
      ok: true;
      data: {
        bouquetId: string;
        displayName: string;
        authorEmail: string;
        rating: number;
        reviewText: string;
        locale: Locale | null;
      };
    }
  | { ok: false; message: string } {
  const bouquetId = typeof input.bouquetId === 'string' ? input.bouquetId.trim() : '';
  if (!isProductReviewUuid(bouquetId)) {
    return { ok: false, message: 'Product not found' };
  }

  const displayName = stripControlChars(
    typeof input.displayName === 'string' ? input.displayName.trim() : ''
  );
  if (!displayName) return { ok: false, message: 'Name is required' };
  if (displayName.length > PRODUCT_REVIEW_MAX_NAME) {
    return { ok: false, message: `Name must be at most ${PRODUCT_REVIEW_MAX_NAME} characters` };
  }

  const authorEmail = normalizeProductReviewEmail(
    typeof input.authorEmail === 'string' ? input.authorEmail : ''
  );
  if (!authorEmail) return { ok: false, message: 'Email is required' };
  if (authorEmail.length > PRODUCT_REVIEW_MAX_EMAIL) {
    return { ok: false, message: 'Email is too long' };
  }
  if (!EMAIL_REGEX.test(authorEmail)) {
    return { ok: false, message: 'Please enter a valid email address' };
  }

  const ratingRaw =
    typeof input.rating === 'number' ? input.rating : parseInt(String(input.rating ?? ''), 10);
  if (!Number.isInteger(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
    return { ok: false, message: 'Rating must be between 1 and 5' };
  }

  const reviewText = stripControlChars(
    typeof input.reviewText === 'string' ? input.reviewText.trim() : ''
  );
  if (!reviewText) return { ok: false, message: 'Review text is required' };
  if (reviewText.length < PRODUCT_REVIEW_MIN_TEXT) {
    return { ok: false, message: `Review must be at least ${PRODUCT_REVIEW_MIN_TEXT} characters` };
  }
  if (reviewText.length > PRODUCT_REVIEW_MAX_TEXT) {
    return { ok: false, message: `Review must be at most ${PRODUCT_REVIEW_MAX_TEXT} characters` };
  }

  const localeRaw = typeof input.locale === 'string' ? input.locale.trim() : '';
  const locale = isValidLocale(localeRaw) ? localeRaw : null;

  return {
    ok: true,
    data: { bouquetId, displayName, authorEmail, rating: ratingRaw, reviewText, locale },
  };
}
