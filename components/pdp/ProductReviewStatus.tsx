import type { ProductReviewStats } from '@/lib/productReviews';
import { translations, type Locale } from '@/lib/i18n';
import { ProductReviewStars } from '@/components/pdp/ProductReviewStars';
import styles from './product-pdp.module.css';

export function ProductReviewStatus({
  lang,
  stats,
}: {
  lang: Locale;
  stats: ProductReviewStats;
}) {
  const t = translations[lang].product;
  const writeLabel = t.writeAReview ?? 'Write a review';

  if (stats.count < 1) {
    return (
      <p className={styles.reviewStatus}>
        <span>{t.noProductReviewsYet ?? 'No product reviews yet'}</span>
        <span className={styles.reviewStatusSep} aria-hidden>
          ·
        </span>
        <a className={styles.reviewStatusLink} href="#product-reviews">
          {writeLabel}
        </a>
      </p>
    );
  }

  const countLabel =
    stats.count === 1
      ? t.reviewCountOne ?? '1 review'
      : (t.reviewCount ?? '{count} reviews').replace('{count}', String(stats.count));

  return (
    <p className={styles.reviewStatus}>
      <ProductReviewStars rating={stats.average} size={14} />
      <span className={styles.reviewStatusScore}>{stats.average.toFixed(1)}</span>
      <span className={styles.reviewStatusSep} aria-hidden>
        ·
      </span>
      <a className={styles.reviewStatusLink} href="#product-reviews">
        {countLabel}
      </a>
      <span className={styles.reviewStatusSep} aria-hidden>
        ·
      </span>
      <a className={styles.reviewStatusLink} href="#product-reviews">
        {writeLabel}
      </a>
    </p>
  );
}
