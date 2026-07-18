/** Google Business place page (view all reviews) — update when your Maps link changes */
export const GOOGLE_PLACE_URL = 'https://g.page/r/CclGzPBur8RbEBM';

/** Google Business "Leave a review" URL - opens in new tab */
export const GOOGLE_REVIEW_URL = `${GOOGLE_PLACE_URL}/review`;

/** Shown on the homepage Google Reviews badge (update when Google stats change). */
export const GOOGLE_BUSINESS_RATING = Number(
  process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_RATING ?? '5'
);

export const GOOGLE_BUSINESS_REVIEW_COUNT = Number(
  process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_REVIEW_COUNT ?? '20'
);
  