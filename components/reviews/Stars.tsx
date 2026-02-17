'use client';

import styles from './reviews.module.css';

/**
 * Accessible star rating display. Renders 5 stars, filled based on rating.
 */
export function Stars({ rating }: { rating: number }) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={styles.starsContainer}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= value ? `${styles.star} ${styles.starFilled}` : `${styles.star} ${styles.starEmpty}`}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}
