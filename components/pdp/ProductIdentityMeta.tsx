import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { StorefrontIcon } from '@/components/icons';
import styles from './product-pdp.module.css';

type ProductIdentityMetaProps = {
  lang: Locale;
  featuredPopular?: boolean;
  reviewAverage: number;
  reviewCount: number;
};

export function ProductIdentityMeta({
  lang,
  featuredPopular,
  reviewAverage,
  reviewCount,
}: ProductIdentityMetaProps) {
  const tCatalog = translations[lang].catalog;
  const tReviews = translations[lang].reviews;
  const reviewsHref = `/${lang}/reviews`;
  const showReviews = reviewCount > 0;
  const showPopular = featuredPopular === true;

  if (!showReviews && !showPopular) return null;

  const reviewLabel = `${reviewAverage.toFixed(1)} · ${reviewCount.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')} ${tReviews.reviewsCount}`;

  return (
    <div className={styles.identityMeta}>
      {showReviews ? (
        <Link
          href={reviewsHref}
          className={styles.reviewMeta}
          aria-label={reviewLabel}
        >
          <svg
            className={styles.reviewMetaStar}
            viewBox="0 0 24 24"
            width={14}
            height={14}
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            />
          </svg>
          <span className={styles.reviewMetaText}>{reviewLabel}</span>
        </Link>
      ) : null}
      {showReviews && showPopular ? (
        <span className={styles.identityMetaSep} aria-hidden>
          |
        </span>
      ) : null}
      {showPopular ? (
        <span className={styles.popularBadge} aria-label={tCatalog.popularPickAria}>
          <span className={styles.popularBadgeIconWrap} aria-hidden>
            <StorefrontIcon name="local-fire-department" filled className={styles.popularBadgeIcon} size={16} />
          </span>
          <span className={styles.popularBadgeLabel}>{tCatalog.popularPickBadge}</span>
        </span>
      ) : null}
    </div>
  );
}
