import { getAllReviewsAsync } from '@/lib/reviews';
import { GOOGLE_REVIEW_URL } from '@/lib/reviewsConfig';
import { AddReviewForm } from './AddReviewForm';
import { ReviewList } from './ReviewList';

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsAsync();

  return (
    <div className="admin-detail">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Reviews</h1>
          <p className="admin-hint">
            Add reviews pasted from Google Maps. &quot;Leave a review&quot; links to your Google
            Business.
          </p>
        </div>
        <div className="admin-header-actions">
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-primary"
          >
            Leave a review
          </a>
        </div>
      </header>

      <section className="admin-section">
        <h2 className="admin-section-title">Add review from Google Maps</h2>
        <p className="admin-muted" style={{ marginBottom: 16 }}>
          Copy reviewer name, rating, and text from Google Maps, then paste below. You can leave
          &quot;Review date&quot; empty to use today.
        </p>
        <AddReviewForm />
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">Recent reviews ({reviews.length})</h2>
        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
