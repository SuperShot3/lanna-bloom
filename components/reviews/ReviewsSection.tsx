import { getFeaturedReviewsAsync, getReviewStatsAsync } from '@/lib/reviews';
import { Stars } from './Stars';
import { GOOGLE_REVIEW_URL, GOOGLE_PLACE_URL } from '@/lib/reviewsConfig';
import styles from './reviews.module.css';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

interface ReviewsSectionProps {
  lang: Locale;
  title?: string;
  subtitle?: string;
}

export async function ReviewsSection({
  lang,
  title,
  subtitle,
}: ReviewsSectionProps) {
  const [reviews, stats] = await Promise.all([
    getFeaturedReviewsAsync(3),
    getReviewStatsAsync(),
  ]);
  const t = translations[lang].reviews;

  if (stats.count === 0) {
    return null;
  }

  const displayTitle = title ?? t.title;
  const displaySubtitle = subtitle ?? t.subtitle;

  const avatarReviews = reviews.slice(0, 3);
  const moreCount = Math.max(0, stats.count - 3);

  return (
    <section
      className={styles.reviewsSection}
      aria-labelledby="reviews-section-title"
    >
      <div className="container">
        <header className={styles.reviewsHeader}>
          <h2 id="reviews-section-title" className={styles.reviewsTitle}>
            {displayTitle}
          </h2>
          {displaySubtitle && (
            <p className={styles.reviewsSubtitle}>{displaySubtitle}</p>
          )}
        </header>

        {/* Google review summary only - no individual cards */}
        <div className={styles.reviewSummaryCard}>
          <img
            src="/icons/google-icon-logo-svgrepo-com.svg"
            alt=""
            className={styles.reviewSummaryGoogleLogo}
            width={24}
            height={24}
            aria-hidden
          />
          <div className={styles.reviewSummaryStars}>
            <Stars rating={Math.round(stats.average)} />
          </div>
          <p className={styles.reviewSummaryRating} aria-live="polite">
            {stats.average.toFixed(1)} {t.ratingFrom} {stats.count} {t.reviewsCount}
          </p>
          <div className={styles.reviewSummaryAvatars}>
            {avatarReviews.map((r) => (
              <div
                key={r.id}
                className={styles.reviewSummaryAvatar}
                title={r.name}
              >
                {r.initials}
              </div>
            ))}
            {moreCount > 0 && (
              <div className={`${styles.reviewSummaryAvatar} ${styles.reviewSummaryAvatarMore}`}>
                +{moreCount}
              </div>
            )}
          </div>
          <div className={styles.reviewSummaryActions}>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.reviewsCtaLeaveReviewButton}
            >
              {t.leaveReview}
            </a>
            <a
              href={GOOGLE_PLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.reviewsCtaAllOnGoogle}
            >
              {t.allReviewsOnGoogle}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
