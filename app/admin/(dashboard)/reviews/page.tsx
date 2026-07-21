import { getAllReviewsAsync } from '@/lib/reviews';
import { GOOGLE_REVIEW_URL } from '@/lib/reviewsConfig';
import { AddReviewForm } from './AddReviewForm';
import { CustomerReviewInvite } from './CustomerReviewInvite';
import { ReviewList } from './ReviewList';
import { CouponsStatusSection } from './CouponsStatusSection';

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsAsync();

  return (
    <div className="admin-detail">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Reviews &amp; Coupons</h1>
          <p className="admin-hint">
            Google review invites and pasted reviews, plus a read-only view of storefront promo
            codes.
          </p>
        </div>
      </header>

      <section className="admin-section">
        <h2 className="admin-section-title">Send customer review link 🌸</h2>
        <p className="admin-muted" style={{ margin: '6px 0 12px' }}>
          Copy this short message after delivery and send it to the customer.
        </p>
        <CustomerReviewInvite reviewUrl={GOOGLE_REVIEW_URL} />
      </section>

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

      <CouponsStatusSection />
    </div>
  );
}
