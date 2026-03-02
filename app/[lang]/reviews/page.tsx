import { getAllReviewsAsync, getReviewStatsAsync } from '@/lib/reviews';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { Stars } from '@/components/reviews/Stars';
import { GOOGLE_REVIEW_URL } from '@/lib/reviewsConfig';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import styles from '@/components/reviews/reviews.module.css';

export default async function ReviewsPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  const [reviews, stats] = await Promise.all([
    getAllReviewsAsync(),
    getReviewStatsAsync(),
  ]);

  // Sort: featured first, then newest date desc
  const sorted = [...reviews].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const t = translations[lang as Locale].reviews;
  const avatarReviews = sorted.slice(0, 3);
  const moreCount = Math.max(0, stats.count - 3);

  return (
    <div className="reviews-page">
      <div className="container">
        <header className={styles.reviewsHeader}>
          <div className={styles.reviewsHeaderTop}>
            <h1 id="reviews-page-title" className={styles.reviewsTitle}>
              {t.pageTitle}
            </h1>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.reviewsCtaLeaveReview}
            >
              {t.leaveReview}
            </a>
          </div>
        </header>

        {sorted.length === 0 ? (
          <p className={styles.reviewsSubtitle}>{t.noReviews}</p>
        ) : (
          <>
            {/* Summary card */}
            <div className={styles.reviewSummaryCard}>
              <span className={styles.reviewSummaryGoogleLogo} aria-hidden>
                G
              </span>
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
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.reviewsCtaLeaveReviewButton}
              >
                {t.leaveReview}
              </a>
            </div>

            <div className={styles.reviewsGrid} role="list">
              {sorted.map((review) => (
                <div key={review.id} role="listitem">
                  <ReviewCard review={review} seeMoreLabel={t.seeMore} variant="grid" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
