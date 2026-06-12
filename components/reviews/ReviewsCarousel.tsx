'use client';

import { useRef } from 'react';
import { ReviewCard } from './ReviewCard';
import type { Review } from '@/lib/reviews';
import styles from './reviews.module.css';

interface ReviewsCarouselProps {
  reviews: Review[];
  seeMoreLabel?: string;
}

export function ReviewsCarousel({ reviews, seeMoreLabel }: ReviewsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320;
    const amount = direction === 'left' ? -cardWidth : cardWidth;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  return (
    <div className={styles.carouselWrap}>
      <button
        type="button"
        className={styles.carouselArrow}
        onClick={() => scroll('left')}
        aria-label="Previous reviews"
      >
        ‹
      </button>
      <div ref={scrollRef} className={styles.carouselTrack} role="list">
        {reviews.map((review) => (
          <div key={review.id} className={styles.carouselCard} role="listitem">
            <ReviewCard review={review} seeMoreLabel={seeMoreLabel} />
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.carouselArrow}
        onClick={() => scroll('right')}
        aria-label="Next reviews"
      >
        ›
      </button>
    </div>
  );
}
