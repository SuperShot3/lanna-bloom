import { getAllGuideCommentsForAdmin } from '@/lib/info/guideComments/read';
import { listProductReviewsForAdmin } from '@/lib/productReviews';
import { InfoCommentModerationList } from './InfoCommentModerationList';
import { ProductReviewModerationList } from '../reviews/ProductReviewModerationList';

export default async function AdminInfoCommentsPage() {
  const comments = await getAllGuideCommentsForAdmin();
  const productReviews = await listProductReviewsForAdmin();
  const pendingComments = comments.filter((c) => c.status === 'pending').length;
  const pendingReviews = productReviews.filter((r) => r.status === 'pending').length;

  return (
    <div className="admin-detail">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Guide comments</h1>
          <p className="admin-hint">
            Moderate reader comments on info and guide pages, and customer reviews submitted on
            bouquet pages. New submissions stay pending until approved. Product reviews must be
            email-confirmed before they appear here.
          </p>
        </div>
      </header>

      <section className="admin-section">
        <h2 className="admin-section-title">
          Product reviews ({productReviews.length}
          {pendingReviews > 0 ? ` · ${pendingReviews} pending` : ''})
        </h2>
        <p className="admin-muted" style={{ margin: '6px 0 12px' }}>
          Only email-confirmed reviews appear here. Approved reviews show on the product page and
          in Google Product structured data.
        </p>
        <ProductReviewModerationList reviews={productReviews} />
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          Comments ({comments.length}
          {pendingComments > 0 ? ` · ${pendingComments} pending` : ''})
        </h2>
        <InfoCommentModerationList comments={comments} />
      </section>
    </div>
  );
}
