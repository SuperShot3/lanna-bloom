import { getAllGuideCommentsForAdmin } from '@/lib/info/guideComments/read';
import { InfoCommentModerationList } from './InfoCommentModerationList';

export default async function AdminInfoCommentsPage() {
  const comments = await getAllGuideCommentsForAdmin();
  const pendingCount = comments.filter((c) => c.status === 'pending').length;

  return (
    <div className="admin-detail">
      <header className="admin-header admin-page-header">
        <div>
          <h1 className="admin-title">Guide comments</h1>
          <p className="admin-hint">
            Moderate reader comments on info and guide pages. New submissions are pending until
            approved.
          </p>
        </div>
      </header>

      <section className="admin-section">
        <h2 className="admin-section-title">
          Comments ({comments.length}
          {pendingCount > 0 ? ` · ${pendingCount} pending` : ''})
        </h2>
        <InfoCommentModerationList comments={comments} />
      </section>
    </div>
  );
}
