'use client';

import { useId, useMemo } from 'react';
import {
  GOOGLE_BUSINESS_RATING,
  GOOGLE_BUSINESS_REVIEW_COUNT,
  GOOGLE_PLACE_URL,
} from '@/lib/reviewsConfig';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import styles from './google-reviews-badge.module.css';

function GoogleGLogo() {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function PartialStar({ fill, gradientId }: { fill: number; gradientId: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, fill)) * 100);
  return (
    <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradientId}>
          <stop offset={`${pct}%`} stopColor="#F9AB00" />
          <stop offset={`${pct}%`} stopColor="#E7E5E4" />
        </linearGradient>
      </defs>
      <polygon
        points="10,1 12.9,7 19.5,7.6 14.8,11.8 16.4,18.3 10,14.5 3.6,18.3 5.2,11.8 0.5,7.6 7.1,7"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

type Props = {
  lang: Locale;
  className?: string;
  /** Override maps URL (defaults to `GOOGLE_PLACE_URL` in lib/reviewsConfig.ts). */
  mapsUrl?: string;
};

export function GoogleReviewsBadge({ lang, className = '', mapsUrl }: Props) {
  const t = translations[lang].hero;
  const rating = GOOGLE_BUSINESS_RATING;
  const reviewCount = GOOGLE_BUSINESS_REVIEW_COUNT;
  const href = mapsUrl?.trim() || GOOGLE_PLACE_URL;
  const baseId = useId().replace(/:/g, '');
  const locale = lang === 'th' ? 'th-TH' : 'en-US';

  const stars = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        fill: Math.min(1, Math.max(0, rating - i)),
        id: `${baseId}-star-${i + 1}`,
      })),
    [baseId, rating]
  );

  const countLabel = t.googleReviewsBasedOn.replace(
    '{count}',
    reviewCount.toLocaleString(locale)
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={t.googleReviewsTitle}
      className={`${styles.widget} ${className}`.trim()}
    >
      <span className={styles.logo}>
        <GoogleGLogo />
      </span>
      <span className={styles.info}>
        <span className={styles.label}>{t.googleReviewsLabel}</span>
        <span className={styles.row}>
          <span className={styles.score}>{rating.toFixed(1)}</span>
          <span className={styles.stars} aria-label={t.googleReviewsStars.replace('{rating}', rating.toFixed(1))}>
            {stars.map((star) => (
              <PartialStar key={star.id} fill={star.fill} gradientId={star.id} />
            ))}
          </span>
        </span>
        <span className={styles.count}>{countLabel}</span>
      </span>
    </a>
  );
}
