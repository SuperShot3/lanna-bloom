import Link from 'next/link';
import { LeaveReviewForm } from './LeaveReviewForm';
import { translations } from '@/lib/i18n';
import styles from './review.module.css';

export const metadata = {
  title: 'Leave a Review | Lanna Bloom',
  description: 'Share your experience with Lanna Bloom. Your feedback helps us improve.',
};

export default function ReviewPage() {
  const t = translations.en.reviews;

  return (
    <div className={styles.reviewPage}>
      <div className="container">
        <header className={styles.reviewHeader}>
          <Link href="/en" className={styles.reviewHomeLink}>
            Lanna Bloom
          </Link>
          <h1 className={styles.reviewTitle}>{t.leaveReviewTitle}</h1>
          <p className={styles.reviewSubtitle}>{t.leaveReviewSubtitle}</p>
        </header>
        <LeaveReviewForm
          t={{
            leaveReviewTitle: t.leaveReviewTitle,
            leaveReviewSubtitle: t.leaveReviewSubtitle,
            namePlaceholder: t.namePlaceholder,
            commentPlaceholder: t.commentPlaceholder,
            submitButton: t.submitButton,
            successMessage: t.successMessage,
            errorMessage: t.errorMessage,
            backToHome: t.backToHome,
          }}
        />
      </div>
    </div>
  );
}
