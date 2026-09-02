/**
 * Reviews data loader and types.
 * Data source: /data/reviews.json (edit that file to update reviews).
 */

import reviewsData from '@/data/reviews.json';
import type { DeliveryDestinationId } from '@/lib/delivery/markets';

export interface Review {
  id: string;
  name: string;
  initials: string;
  rating: number;
  text: string;
  date: string;
  location: string;
  featured: boolean;
}

const DESTINATION_CITY_NAMES: Record<DeliveryDestinationId, string[]> = {
  CHIANG_MAI: ['Chiang Mai', 'เชียงใหม่', '清邁', '清迈', 'Чиангмае'],
  BANGKOK: ['Bangkok', 'กรุงเทพ', '曼谷'],
  PATTAYA: ['Pattaya', 'พัทยา'],
  PHUKET: ['Phuket', 'ภูเก็ต', '普吉'],
  KRABI: ['Krabi', 'กระบี่', 'Ao Nang', 'อ่าวนาง'],
  SAMUI: ['Koh Samui', 'Samui', 'เกาะสมุย', 'สมุย', '蘇梅', '苏梅'],
  HUA_HIN: ['Hua Hin', 'หัวหิน'],
  LAMPHUN: ['Lamphun', 'ลำพูน'],
  PAI: ['Pai', 'ปาย'],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textMentionsName(haystack: string, name: string): boolean {
  const pattern =
    name.length <= 3
      ? new RegExp(`(?:^|[^\\p{L}])${escapeRegExp(name)}(?:$|[^\\p{L}])`, 'iu')
      : new RegExp(escapeRegExp(name), 'iu');
  return pattern.test(haystack);
}

/** True when review text or location names a city other than the current market. */
export function reviewMentionsForeignCity(
  review: Pick<Review, 'text' | 'location'>,
  allowedDestinationId: DeliveryDestinationId
): boolean {
  const haystack = `${review.text} ${review.location}`;
  const allowed = new Set(
    DESTINATION_CITY_NAMES[allowedDestinationId].map((n) => n.toLowerCase())
  );
  for (const [dest, names] of Object.entries(DESTINATION_CITY_NAMES) as [
    DeliveryDestinationId,
    string[],
  ][]) {
    if (dest === allowedDestinationId) continue;
    for (const name of names) {
      if (allowed.has(name.toLowerCase())) continue;
      if (textMentionsName(haystack, name)) return true;
    }
  }
  return false;
}

export const CITY_NEUTRAL_REVIEW_FALLBACK =
  "I ordered a bouquet for my mother's birthday and it was delivered within 45 minutes. The flowers were fresher than anything I've seen in the markets. Truly premium service.";

export function getCityNeutralFeaturedQuote(
  allowedDestinationId: DeliveryDestinationId,
  fallback = CITY_NEUTRAL_REVIEW_FALLBACK
): string {
  const match = getFeaturedReviews(12).find(
    (review) => !reviewMentionsForeignCity(review, allowedDestinationId)
  );
  return match?.text || fallback;
}

function isValidReview(raw: unknown): raw is Review {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.initials === 'string' &&
    typeof o.rating === 'number' &&
    o.rating >= 1 &&
    o.rating <= 5 &&
    typeof o.text === 'string' &&
    typeof o.date === 'string' &&
    typeof o.location === 'string' &&
    typeof o.featured === 'boolean'
  );
}

function parseReviews(): Review[] {
  try {
    const data = Array.isArray(reviewsData) ? reviewsData : [];
    const valid: Review[] = [];
    for (const item of data) {
      if (isValidReview(item)) valid.push(item);
    }
    return valid;
  } catch {
    return [];
  }
}

const cachedReviews = parseReviews();

function getReviews(): Review[] {
  return cachedReviews;
}

/**
 * Returns all reviews.
 */
export function getAllReviews(): Review[] {
  return [...getReviews()];
}

/**
 * Returns featured reviews, limited to `limit` (default 6).
 */
export function getFeaturedReviews(limit = 6): Review[] {
  const featured = getReviews().filter((r) => r.featured);
  return featured.slice(0, limit);
}

/**
 * Returns aggregate stats: average rating and total count.
 */
export function getReviewStats(): { average: number; count: number } {
  const reviews = getReviews();
  const count = reviews.length;
  if (count === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / count) * 10) / 10; // 1 decimal
  return { average, count };
}

/**
 * Returns all reviews (static + DB). Use in server components.
 */
export async function getAllReviewsAsync(): Promise<Review[]> {
  const { getCustomerReviewsFromDb } = await import('@/lib/reviewsDb');
  const staticReviews = getReviews();
  const dbReviews = await getCustomerReviewsFromDb();
  const merged = [...staticReviews, ...dbReviews];
  return merged.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Returns featured reviews (static featured first, then newest DB), limited to `limit`.
 */
export async function getFeaturedReviewsAsync(limit = 6): Promise<Review[]> {
  const all = await getAllReviewsAsync();
  const featured = all.filter((r) => r.featured);
  if (featured.length >= limit) return featured.slice(0, limit);
  const rest = all.filter((r) => !r.featured).slice(0, limit - featured.length);
  return [...featured, ...rest];
}

/**
 * Returns aggregate stats including DB reviews.
 */
export async function getReviewStatsAsync(): Promise<{
  average: number;
  count: number;
}> {
  const reviews = await getAllReviewsAsync();
  const count = reviews.length;
  if (count === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / count) * 10) / 10;
  return { average, count };
}
