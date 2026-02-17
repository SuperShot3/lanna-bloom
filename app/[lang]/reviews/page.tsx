import { getAllReviews, getReviewStats } from '@/lib/reviews';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import styles from '@/components/reviews/reviews.module.css';

export default function ReviewsPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isValidLocale(params.lang) ? params.lang : 'en';
  const reviews = getAllReviews();
  const stats = getReviewStats();

  // Sort: featured first, then newest date desc
  const sorted = [...reviews].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const t = translations[lang as Locale].reviews;
  const statsLine =
    stats.count > 0
      ? `${stats.average} ★ (${stats.count} ${t.reviewsCount})`
      : null;

  return (
    <div className="reviews-page">
      <div className="container">
        <header className={styles.reviewsHeader}>
          <h1 id="reviews-page-title" className={styles.reviewsTitle}>
            {t.pageTitle}
          </h1>
          {statsLine && (
            <p className={styles.reviewsStats} aria-live="polite">
              {statsLine}
            </p>
          )}
        </header>

        {sorted.length === 0 ? (
          <p className={styles.reviewsSubtitle}>{t.noReviews}</p>
        ) : (
          <div className={styles.reviewsGrid} role="list">
            {sorted.map((review) => (
              <div key={review.id} role="listitem">
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
