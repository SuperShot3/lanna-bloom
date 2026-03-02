'use client';

import { useState } from 'react';
import type { Review } from '@/lib/reviews';
import { Stars } from './Stars';
import styles from './reviews.module.css';

const TRUNCATE_LENGTH = 120;

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

interface ReviewCardProps {
  review: Review;
  seeMoreLabel?: string;
  variant?: 'carousel' | 'grid';
}

export function ReviewCard({ review, seeMoreLabel = 'See more', variant = 'carousel' }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isGrid = variant === 'grid';
  const showFull = isGrid || expanded;
  const isLong = review.text.length > TRUNCATE_LENGTH;
  const displayText = showFull || !isLong ? review.text : review.text.slice(0, TRUNCATE_LENGTH);
  const showSeeMore = !isGrid && isLong && !expanded;

  return (
    <article
      className={`${styles.reviewCard} ${isGrid ? styles.reviewCardGrid : ''}`}
      aria-labelledby={`review-name-${review.id}`}
    >
      <div className={styles.reviewCardAvatar}>
        <div
          className={styles.reviewAvatar}
          role="img"
          aria-label={`Avatar for ${review.name}`}
        >
          {review.initials}
        </div>
      </div>
      <div className={styles.reviewStars}>
        <Stars rating={review.rating} />
      </div>
      <p id={`review-name-${review.id}`} className={styles.reviewName}>
        {review.name}
      </p>
      <p className={styles.reviewDate}>{formatDate(review.date)}</p>
      <div className={`${styles.reviewTextWrap} ${showFull ? styles.reviewTextWrapExpanded : ''}`}>
        <p className={styles.reviewText}>{displayText}{showSeeMore ? '...' : ''}</p>
        {showSeeMore && (
          <button
            type="button"
            className={styles.reviewSeeMore}
            onClick={() => setExpanded(true)}
          >
            {seeMoreLabel}
          </button>
        )}
      </div>
    </article>
  );
}
