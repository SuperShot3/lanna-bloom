import { getAllReviewsAsync } from '@/lib/reviews';
import { GOOGLE_REVIEW_URL } from '@/lib/reviewsConfig';
import { AddReviewForm } from './AddReviewForm';
import { ReviewList } from './ReviewList';

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsAsync();

  return (
    <div className="admin-v2-detail">
      <header className="admin-v2-header admin-page-header">
        <div>
          <h1 className="admin-v2-title">Reviews</h1>
          <p className="admin-v2-hint">
            Add reviews pasted from Google Maps. &quot;Leave a review&quot; links to your Google
            Business.
          </p>
        </div>
        <div className="admin-v2-header-actions">
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-v2-btn admin-v2-btn-primary"
          >
            Open Google review page
          </a>
        </div>
      </header>

      <section className="admin-v2-section">
        <h2 className="admin-v2-section-title">Add review from Google Maps</h2>
        <p className="admin-v2-muted" style={{ marginBottom: 16 }}>
          Copy reviewer name, rating, and text from Google Maps, then paste below. You can leave
          &quot;Review date&quot; empty to use today.
        </p>
        <AddReviewForm />
      </section>

      <section className="admin-v2-section">
        <h2 className="admin-v2-section-title">Recent reviews ({reviews.length})</h2>
        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
