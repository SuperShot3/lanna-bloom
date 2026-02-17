import Link from 'next/link';
import { getFeaturedReviews, getReviewStats } from '@/lib/reviews';
import { ReviewCard } from './ReviewCard';
import styles from './reviews.module.css';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

interface ReviewsSectionProps {
  lang: Locale;
  limit?: number;
  title?: string;
  subtitle?: string;
}

export function ReviewsSection({
  lang,
  limit = 6,
  title,
  subtitle,
}: ReviewsSectionProps) {
  const reviews = getFeaturedReviews(limit);
  const stats = getReviewStats();
  const t = translations[lang].reviews;

  if (reviews.length === 0) {
    return null;
  }

  const displayTitle = title ?? t.title;
  const displaySubtitle = subtitle ?? t.subtitle;
  const statsLine =
    stats.count > 0
      ? `${stats.average} ★ (${stats.count} ${t.reviewsCount})`
      : null;

  return (
    <section
      className={styles.reviewsSection}
      aria-labelledby="reviews-section-title"
    >
      <div className="container">
        <header className={styles.reviewsHeader}>
          <div className={styles.reviewsHeaderTop}>
            <h2 id="reviews-section-title" className={styles.reviewsTitle}>
              {displayTitle}
            </h2>
            <Link
              href={`/${lang}/reviews`}
              className={styles.reviewsCtaPrimary}
            >
              {t.seeAllReviews}
            </Link>
          </div>
          {displaySubtitle && (
            <p className={styles.reviewsSubtitle}>{displaySubtitle}</p>
          )}
          {statsLine && (
            <p className={styles.reviewsStats} aria-live="polite">
              {statsLine}
            </p>
          )}
        </header>

        <div className={styles.reviewsGrid} role="list">
          {reviews.map((review) => (
            <div key={review.id} role="listitem">
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
