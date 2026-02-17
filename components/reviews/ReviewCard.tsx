'use client';

import type { Review } from '@/lib/reviews';
import { Stars } from './Stars';
import styles from './reviews.module.css';

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article
      className={styles.reviewCard}
      aria-labelledby={`review-name-${review.id}`}
    >
      <div className={styles.reviewCardHeader}>
        <div
          className={styles.reviewAvatar}
          role="img"
          aria-label={`Avatar for ${review.name}`}
        >
          {review.initials}
        </div>
        <div className={styles.reviewMeta}>
          <p id={`review-name-${review.id}`} className={styles.reviewName}>
            {review.name}
          </p>
          <div className={styles.reviewStars}>
            <Stars rating={review.rating} />
          </div>
        </div>
      </div>
      <p className={styles.reviewText}>{review.text}</p>
      <footer className={styles.reviewFooter}>
        <p className={styles.reviewDate}>{formatDate(review.date)}</p>
        <p className={styles.reviewLocation}>{review.location}</p>
      </footer>
    </article>
  );
}
