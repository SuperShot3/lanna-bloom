import {
  GOOGLE_BUSINESS_RATING,
  GOOGLE_BUSINESS_REVIEW_COUNT,
  GOOGLE_PLACE_URL,
} from '@/lib/reviewsConfig';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { GoogleGIcon } from '@/components/icons/GoogleGIcon';
import styles from './google-reviews-badge.module.css';

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
  mapsUrl?: string;
  idPrefix?: string;
};

export function GoogleReviewsBadge({
  lang,
  className = '',
  mapsUrl,
  idPrefix = 'google-reviews',
}: Props) {
  const t = translations[lang].hero;
  const rating = GOOGLE_BUSINESS_RATING;
  const reviewCount = GOOGLE_BUSINESS_REVIEW_COUNT;
  const href = mapsUrl?.trim() || GOOGLE_PLACE_URL;
  const locale = lang === 'th' ? 'th-TH' : 'en-US';

  const stars = Array.from({ length: 5 }, (_, i) => ({
    fill: Math.min(1, Math.max(0, rating - i)),
    id: `${idPrefix}-star-${i + 1}`,
  }));

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
        <GoogleGIcon size={36} />
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
