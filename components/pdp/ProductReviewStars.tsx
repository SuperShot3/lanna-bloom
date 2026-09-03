'use client';

import { useId, useState } from 'react';
import styles from './product-pdp.module.css';

const STAR_POINTS = '10,1 12.9,7 19.5,7.6 14.8,11.8 16.4,18.3 10,14.5 3.6,18.3 5.2,11.8 0.5,7.6 7.1,7';

export function ProductReviewStars({
  rating,
  size = 16,
  interactive = false,
  onChange,
  labelledBy,
  disabled = false,
  starLabel,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  labelledBy?: string;
  disabled?: boolean;
  starLabel?: (value: number) => string;
}) {
  const uid = useId().replace(/:/g, '');
  const [hoverValue, setHoverValue] = useState(0);
  const safe = Math.min(5, Math.max(0, rating));

  if (!interactive) {
    const stars = Array.from({ length: 5 }, (_, i) => Math.min(1, Math.max(0, safe - i)));
    return (
      <span className={styles.reviewStars} aria-hidden>
        {stars.map((fill, i) => {
          const gradientId = `${uid}-star-${i}`;
          const pct = Math.round(fill * 100);
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id={gradientId}>
                  <stop offset={`${pct}%`} stopColor="#C5A059" />
                  <stop offset={`${pct}%`} stopColor="#E8E0D8" />
                </linearGradient>
              </defs>
              <polygon points={STAR_POINTS} fill={`url(#${gradientId})`} />
            </svg>
          );
        })}
      </span>
    );
  }

  const preview = hoverValue || safe;

  return (
    <div
      className={styles.reviewStarPicker}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onMouseLeave={() => setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = preview >= value;
        const label = starLabel?.(value) ?? `${value}`;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={safe === value}
            aria-label={label}
            className={styles.reviewStarPick}
            disabled={disabled}
            onMouseEnter={() => setHoverValue(value)}
            onFocus={() => setHoverValue(value)}
            onClick={() => onChange?.(value)}
          >
            <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <polygon points={STAR_POINTS} fill={filled ? '#C5A059' : '#E8E0D8'} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
