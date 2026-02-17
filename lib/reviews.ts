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
