/**
 * Reviews data loader and types.
 * Data source: /data/reviews.json (edit that file to update reviews).
 */

import reviewsData from '@/data/reviews.json';

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
